/**
 * URL safety. Two jobs:
 *
 * 1. Links that arrive from data (notification deep links, redirects after sign-in)
 *    may only point inside the portal, so a bad row can never become an off-site
 *    redirect or a javascript: URL.
 * 2. Working links must be https and on an approved company workspace provider
 *    (BR-018). This blocks javascript:/data: URLs from ever reaching an href (XSS)
 *    and narrows what the backend may be asked to fetch (SSRF). The backend must
 *    enforce the same allowlist and must never fetch a working link server-side
 *    without it.
 */

/** An in-app path, or null for anything that could leave the portal. */
export function internalPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null;
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) return null;
  return value;
}

/** Company workspace providers a working link may point at. Configurable in AdminX. */
export const WORKSPACE_HOSTS = [
  "figma.com",
  "docs.google.com",
  "drive.google.com",
  "sheets.google.com",
  "slides.google.com",
  "canva.com",
  "github.com",
  "gitlab.com",
  "notion.so",
  "miro.com",
  "frame.io",
  "dropbox.com",
  "onedrive.live.com",
  "sharepoint.com",
] as const;

export type WorkspaceCheck = { ok: true; url: string; host: string } | { ok: false; reason: string };

export function checkWorkspaceUrl(raw: string): WorkspaceCheck {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "Enter a full workspace URL starting with https://" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "Workspace links must use https." };
  if (url.username || url.password) return { ok: false, reason: "Remove the username or password from the link." };
  if (url.port) return { ok: false, reason: "Workspace links cannot use a custom port." };
  const host = url.hostname.toLowerCase();
  // Literal IPs and internal names are what SSRF payloads use.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || !host.includes(".") || host.endsWith(".internal") || host.endsWith(".local") || host === "localhost") {
    return { ok: false, reason: "Use the workspace provider's public address." };
  }
  const allowed = WORKSPACE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (!allowed) return { ok: false, reason: `That host is not an approved company workspace. Approved: ${WORKSPACE_HOSTS.slice(0, 6).join(", ")} and similar.` };
  return { ok: true, url: url.toString(), host };
}

/** For rendering: returns the URL only if it is still a safe workspace link. */
export function safeWorkspaceHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const check = checkWorkspaceUrl(raw);
  return check.ok ? check.url : null;
}
