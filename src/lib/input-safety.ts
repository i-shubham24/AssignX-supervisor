/**
 * Input hygiene for every form and upload in the portal. Ported from Dolancer and
 * extended for the file types supervisors handle.
 *
 * These checks run in the browser, so they catch honest mistakes and casual abuse
 * and give instant feedback. They are NOT the security boundary: the backend must
 * repeat every check (type by content, size, malware scan, PDF active content),
 * because anyone can call the API directly. Values never reach SQL as text here;
 * the data layer sends parameters and never builds a query by joining strings.
 */

/**
 * Control characters (except tab and newline), zero-width spaces and the direction
 * marks and overrides used to disguise text, such as a file name that reads as
 * ".pdf" but ends in ".exe". The zero-width joiner and non-joiner are kept: Indian
 * scripts need them.
 */
const HIDDEN_RANGES: [number, number][] = [
  [0x00, 0x08], [0x0b, 0x0c], [0x0e, 0x1f], [0x7f, 0x7f],
  [0x200b, 0x200b], [0x200e, 0x200f], [0x202a, 0x202e], [0x2060, 0x2064], [0x2066, 0x2069], [0xfeff, 0xfeff],
];
// Built from code points so the source holds no invisible characters itself.
const HIDDEN_CHARS = new RegExp(
  `[${HIDDEN_RANGES.map(([from, to]) => `${String.fromCharCode(from)}-${String.fromCharCode(to)}`).join("")}]`,
  "g",
);

/** Free text: normalised, hidden characters removed, cut to a maximum length. */
export function cleanText(value: string, max: number): string {
  return value.normalize("NFC").replace(HIDDEN_CHARS, "").slice(0, max);
}

/**
 * Flags potential client contact details or identity reveals inside a brief or scope
 * note before it is shared with a doer on Dolancer (PRD 10.1, BR-001).
 */
export function detectBriefPii(text: string, clientName?: string): string[] {
  const warnings: string[] = [];
  if (!text.trim()) return warnings;
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) {
    warnings.push("email address");
  }
  if (/(?:\+?\d[\d\s\-()]{7,}\d)/.test(text)) {
    warnings.push("phone number");
  }
  if (/(?:whatsapp|telegram|signal|skype|instagram\.com|t\.me|linkedin\.com\/in)/i.test(text)) {
    warnings.push("external messaging or social handle");
  }
  if (/\bhttps?:\/\/\S+/i.test(text)) {
    warnings.push("direct external link");
  }
  if (clientName) {
    const parts = clientName
      .trim()
      .split(/\s+/)
      .filter((w) => w.length >= 3);
    if (parts.some((part) => new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text))) {
      warnings.push("client name");
    }
  }
  return warnings;
}

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

export type FileKind = "jpeg" | "png" | "webp" | "gif" | "pdf" | "zip" | "mp4" | "mov" | "mp3" | "wav" | "text";

/** What the first bytes say a file really is, whatever its name claims. */
function sniff(bytes: Uint8Array): FileKind | "executable" | null {
  const at = (offset: number, ...values: number[]) => values.every((value, index) => bytes[offset + index] === value);
  if (at(0, 0x4d, 0x5a) || at(0, 0x7f, 0x45, 0x4c, 0x46) || at(0, 0xcf, 0xfa, 0xed, 0xfe) || at(0, 0x23, 0x21)) return "executable"; // MZ, ELF, Mach-O, shebang
  if (at(0, 0xff, 0xd8, 0xff)) return "jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "webp";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x41, 0x56, 0x45)) return "wav";
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return "gif";
  if (at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) return "pdf";
  // ZIP covers docx, xlsx, pptx, fig exports and source bundles.
  if (at(0, 0x50, 0x4b, 0x03, 0x04) || at(0, 0x50, 0x4b, 0x05, 0x06)) return "zip";
  if (at(4, 0x66, 0x74, 0x79, 0x70)) return at(8, 0x71, 0x74) ? "mov" : "mp4"; // ftyp box
  if (at(0, 0x49, 0x44, 0x33) || at(0, 0xff, 0xfb) || at(0, 0xff, 0xf3)) return "mp3";
  return null;
}

/** Extensions that can run code in a browser or OS. Rejected outright, whatever the bytes say. */
const BLOCKED_EXTENSIONS = /\.(exe|msi|bat|cmd|com|scr|ps1|vbs|js|mjs|jar|sh|app|dmg|apk|html?|xhtml|svg|hta|lnk|iso|reg)$/i;

const PDF_ACTIVE = /\/(JavaScript|JS|Launch|EmbeddedFile|EmbeddedFiles|AA|RichMedia|XFA|SubmitForm|ImportData)(?![A-Za-z0-9])/;

function pdfStructure(bytes: Uint8Array): string {
  const text = new TextDecoder("latin1").decode(bytes);
  return text.replace(/stream\r?\n[\s\S]*?endstream/g, " ").replace(/#([0-9A-Fa-f]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

export interface UploadPolicy {
  label: string;
  allowed: FileKind[];
  maxBytes: number;
  /** Plain text formats (csv, txt, md) have no magic number; allow by extension. */
  textExtensions?: RegExp;
}

const MB = 1024 * 1024;

/** Snapshots shown to the client: images only, redrawn to strip metadata. */
export const SNAPSHOT_POLICY: UploadPolicy = { label: "snapshot", allowed: ["jpeg", "png", "webp"], maxBytes: 15 * MB };
/** Final deliverables and revision files. */
export const DELIVERABLE_POLICY: UploadPolicy = {
  label: "deliverable",
  allowed: ["jpeg", "png", "webp", "gif", "pdf", "zip", "mp4", "mov", "mp3", "wav", "text"],
  maxBytes: 200 * MB,
  textExtensions: /\.(txt|csv|md|json)$/i,
};
/** Originality and AI reports. */
export const REPORT_POLICY: UploadPolicy = { label: "report", allowed: ["pdf"], maxBytes: 25 * MB };
/** Chat attachments. */
export const CHAT_POLICY: UploadPolicy = { ...DELIVERABLE_POLICY, label: "attachment", maxBytes: 25 * MB };

function displaySize(bytes: number) {
  return `${Math.round(bytes / MB)} MB`;
}

/**
 * Check a file by its content against a policy. Returns a problem to show, or null.
 * Scripts inside compressed PDF object streams and malware inside archives cannot
 * be seen from here; the server scan (NFR-016) is the check for those.
 */
export async function checkUpload(file: File, policy: UploadPolicy): Promise<string | null> {
  const name = cleanText(file.name, 200);
  if (name !== file.name) return "The file name contains hidden characters. Rename it and try again.";
  if (BLOCKED_EXTENSIONS.test(name)) return "That file type can run code, so it cannot be uploaded. Zip source files instead.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > policy.maxBytes) return `That ${policy.label} is over ${displaySize(policy.maxBytes)}.`;

  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const kind = sniff(head);
  if (kind === "executable") return "That file is a program, so it cannot be uploaded.";
  const isText = !kind && policy.allowed.includes("text") && policy.textExtensions?.test(name);
  if (!isText && (!kind || !policy.allowed.includes(kind))) return `That ${policy.label} type is not allowed here.`;
  if (kind === "pdf") {
    if (!/\.pdf$/i.test(name)) return "The file type does not match its name. Upload the original file.";
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!new TextDecoder("latin1").decode(bytes.slice(-2048)).includes("%%EOF")) return "This PDF looks damaged. Export it again.";
    if (PDF_ACTIVE.test(pdfStructure(bytes))) return "This PDF has scripts or embedded files. Export a plain PDF.";
  }
  return null;
}

/**
 * Draw an image onto a fresh canvas and save it as a new JPEG. Only the pixels
 * survive: authorship, location and camera metadata are dropped, which matters
 * because a snapshot must never leak who made it (BR-019).
 */
export async function redrawImage(file: File, maxSide = 2400): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not read that image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("Could not read that image.");
    const base = file.name.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-").slice(0, 60) || "snapshot";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

/* ------------------------------------------------------------------ */
/* Client-side rate limiting                                            */
/* ------------------------------------------------------------------ */

/**
 * A sliding-window limiter so the UI stops a burst before the server's 429 does
 * (PRD 13.6: 20 messages per minute per user). The server limit is the real one.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits: number[] = [];
  return {
    /** Returns milliseconds to wait, or 0 if the action may proceed (and records it). */
    take(now = Date.now()): number {
      while (hits.length && now - hits[0]! >= windowMs) hits.shift();
      if (hits.length >= limit) return windowMs - (now - hits[0]!);
      hits.push(now);
      return 0;
    },
  };
}
