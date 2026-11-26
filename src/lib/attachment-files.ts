/**
 * Client-side file registry and safe preview helpers.
 *
 * Keeps real File objects uploaded during the current browser session accessible for
 * preview/download without writing files to persistent browser storage, and builds safe
 * preview content for demo-mode files and KYC identity documents.
 */
import { buildPortalHeaders, resolvePortalUrl } from "@/api/client";
import { env } from "./env";

const sessionFiles = new Map<string, File>();

export function rememberSessionFile(key: string, file: File): void {
  sessionFiles.set(key, file);
  sessionFiles.set(file.name, file);
}

export function findSessionFile(id: string | undefined, filename: string): File | null {
  if (id && sessionFiles.has(id)) return sessionFiles.get(id) ?? null;
  return sessionFiles.get(filename) ?? null;
}

export function triggerFileDownload(blobOrFile: Blob, filename: string): void {
  const url = URL.createObjectURL(blobOrFile);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Builds a clean in-browser SVG preview image (data URI) for demo-only attachments or KYC cards. */
export function buildDemoPreviewSvg(title: string, subtitle: string, lines: string[]): string {
  const safeTitle = escapeXml(title.slice(0, 60));
  const safeSub = escapeXml(subtitle.slice(0, 80));
  const rendered = lines
    .slice(0, 5)
    .map((line, i) => `<text x="36" y="${122 + i * 28}" font-family="system-ui, sans-serif" font-size="14" fill="#334155">${escapeXml(line.slice(0, 72))}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="300" viewBox="0 0 640 300">
    <rect width="640" height="300" rx="16" fill="#f8fafc"/>
    <rect x="16" y="16" width="608" height="268" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <rect x="16" y="16" width="608" height="58" rx="12" fill="#0f172a"/>
    <text x="36" y="45" font-family="system-ui, sans-serif" font-size="17" font-weight="700" fill="#ffffff">${safeTitle}</text>
    <text x="36" y="64" font-family="system-ui, sans-serif" font-size="12" fill="#cbd5e1">${safeSub}</text>
    ${rendered}
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Fetches or resolves a safe signed download URL for live mode attachments. */
export async function resolveLiveAttachmentUrl(attachmentId: string, fallbackUrl?: string | null): Promise<string | null> {
  if (fallbackUrl && /^https:\/\//i.test(fallbackUrl)) return fallbackUrl;
  if (env.demoMode) return null;
  try {
    const headers = await buildPortalHeaders(undefined, true);
    const res = await fetch(resolvePortalUrl(`/api/portal/attachments/${encodeURIComponent(attachmentId)}/url`), {
      headers,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return data.url && /^https:\/\//i.test(data.url) ? data.url : null;
  } catch {
    return null;
  }
}
