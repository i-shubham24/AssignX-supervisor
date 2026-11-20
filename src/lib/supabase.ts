import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * The single Supabase client for the portal.
 *
 * It carries the signed-in operator's JWT and nothing else, so every read and write
 * is evaluated by row level security. The database decides what this segment may
 * see; the portal only renders the result. Tokens live in sessionStorage so they die
 * with the tab, and any stale auth keys in localStorage are purged on start.
 */
function getSessionStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const stale = Object.keys(window.localStorage).filter(
      (key) => key.startsWith("sb-") || key.includes("auth-token") || key.includes("portal.auth"),
    );
    for (const key of stale) window.localStorage.removeItem(key);
  } catch {
    // Restricted storage context.
  }
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function createPortalClient() {
  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storageKey: "assignx.portal.auth",
      storage: getSessionStorage(),
    },
  });
}

type PortalClient = ReturnType<typeof createPortalClient>;

/**
 * In demo mode every feature api answers from sample data before it would reach
 * this client. The stand-in turns a missed branch into an immediate, named error.
 */
function createDemoGuard(): PortalClient {
  return new Proxy({} as PortalClient, {
    get(_target, property) {
      throw new Error(`Supabase is not available in demo mode (supabase.${String(property)}).`);
    },
  });
}

export const supabase = env.demoMode ? createDemoGuard() : createPortalClient();
