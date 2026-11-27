/**
 * Typed, validated environment access. Ported from Dolancer.
 *
 * Fails closed at boot, and refuses to start the portal if backend env vars are
 * missing or if anything resembling a privileged key was wired in. The Supabase
 * secret key carries BYPASSRLS. Even though portal users are trusted staff, the
 * portal must still go through row level security so every read is attributable
 * and scoped to the operator's segment.
 *
 * Detection patterns are assembled from fragments so a `grep` of the built bundle
 * stays a meaningful leak check.
 */

const SECRET = "sec" + "ret";
const ROLE = "ro" + "le";

const SECRET_SHAPES: ReadonlyArray<readonly [RegExp, string]> = [
  [new RegExp("^sb_" + SECRET + "_", "i"), "a Supabase " + SECRET + " key"],
  [/^eyJ[A-Za-z0-9_-]+\./, "a raw JWT, which may be a privileged key"],
  [new RegExp("service_" + ROLE, "i"), "a privileged " + ROLE + " reference"],
  [/^rzp_(live|test)_/i, "a payment provider key"],
];

function detectPrivilegedKey(name: string, value: string): string | null {
  for (const [shape, description] of SECRET_SHAPES) {
    if (shape.test(value)) {
      return (
        `${name} looks like ${description}. Only the publishable key belongs in this app. ` +
        `Privileged keys bypass row level security and must stay in backend functions.`
      );
    }
  }
  return null;
}

/**
 * Demo mode runs the whole portal on built-in sample data with no backend, and its
 * sign-in lets anyone pick a segment. That is a default credential, so:
 * - in development it is on unless VITE_DEMO_MODE is exactly "false";
 * - in a production build it is OFF unless VITE_DEMO_MODE is exactly "true", and a
 *   production demo build announces itself on every screen (see DemoBanner).
 * A production deploy that forgets the variable therefore fails closed: it asks for
 * the real backend configuration instead of serving an open demo.
 */
const raw = import.meta.env.VITE_DEMO_MODE;
const demoMode = import.meta.env.DEV ? raw !== "false" : raw === "true";

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const rawSupabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

const privilegedKeyError = rawSupabasePublishableKey
  ? detectPrivilegedKey("VITE_SUPABASE_PUBLISHABLE_KEY", rawSupabasePublishableKey)
  : null;

const missingVars: string[] = [];
if (!demoMode) {
  if (!rawSupabaseUrl) missingVars.push("VITE_SUPABASE_URL");
  if (!rawSupabasePublishableKey) missingVars.push("VITE_SUPABASE_PUBLISHABLE_KEY");
}

const configError = privilegedKeyError
  ? privilegedKeyError
  : missingVars.length > 0
    ? `Missing ${missingVars.join(" and ")}. Configure these variables in your host environment or copy .env.example to .env.local.`
    : null;

const supabaseUrl = privilegedKeyError ? "" : rawSupabaseUrl;
const supabasePublishableKey = privilegedKeyError ? "" : rawSupabasePublishableKey;
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

export const env = {
  demoMode,
  /** A production bundle running on sample data: show a permanent warning. */
  demoInProduction: demoMode && !import.meta.env.DEV,
  apiBaseUrl,
  supabaseUrl,
  supabasePublishableKey,
  missingVars: missingVars as readonly string[],
  privilegedKeyError,
  configError,
} as const;
