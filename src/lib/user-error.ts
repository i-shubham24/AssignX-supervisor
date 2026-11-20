/**
 * Maps anything thrown into copy an operator can safely read. Ported from Dolancer.
 *
 * PostgREST messages can name tables, constraints or policies. Those never reach the
 * screen (NFR-022). The raw value is logged in dev builds only.
 */
export function toUserError(cause: unknown, fallback: string): string {
  const raw = cause instanceof Error ? cause.message : "";
  if (import.meta.env.DEV && raw) {
    console.warn("[portal] suppressed error detail:", raw);
  }

  const lowered = raw.toLowerCase();
  if (!lowered) return fallback;

  if (/failed to fetch|networkerror|network request failed|load failed/.test(lowered)) {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (/too many|rate limit|rate-limit|\b429\b/.test(lowered)) {
    const retry = raw.match(/retry[- ]after[^\d]*(\d+)/i)?.[1];
    return retry ? `Too many requests. Try again in ${retry} seconds.` : "Too many requests. Wait a minute and try again.";
  }
  if (/otp|token has expired|invalid token/.test(lowered)) {
    return "That code did not work or has expired. Request a new one.";
  }
  if (/not signed in|jwt|not authenticated/.test(lowered)) {
    return "You are signed out. Sign in again to continue.";
  }
  if (/row-level security|permission denied|not permitted/.test(lowered)) {
    return "Your role cannot do that.";
  }
  if (raw.startsWith("PORTAL:")) {
    // Messages raised deliberately by the api layer are written for operators.
    return raw.slice("PORTAL:".length).trim();
  }

  return fallback;
}

/** Throw an operator-readable error from the api layer. */
export function portalError(message: string): Error {
  return new Error(`PORTAL: ${message}`);
}
