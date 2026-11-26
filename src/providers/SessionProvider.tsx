import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { CategorySlug, Operator, Segment } from "@/types/domain";
import { operators, DEMO_IDENTITY } from "@/demo/seed";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { resolvePortalUrl } from "@/api/client";
import { CATEGORY_SLUGS } from "@/lib/config";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Who is signed in, and which segment they hold.
 *
 * Live mode: hydrated from Supabase Auth after email OTP + mandatory TOTP (aal2),
 * paired with JWT segment claims and optionally enriched from GET /api/portal/me.
 * Demo mode: the sign-in screen picks a segment stored in sessionStorage.
 */

interface SessionValue {
  operator: Operator | null;
  segment: Segment | null;
  loading: boolean;
  needsMfa: boolean;
  signIn: (segment: Segment) => void;
  refreshSession: () => Promise<void>;
  signOut: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);
const STORAGE_KEY = "assignx.portal.demo-session";

function readStored(): Segment | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw === "qqd" || raw === "supervisor" || raw === "support" ? raw : null;
  } catch {
    return null;
  }
}

function parseSegment(raw: unknown): Segment | null {
  return raw === "qqd" || raw === "supervisor" || raw === "support" ? raw : null;
}

function operatorFromSession(session: Session, segment: Segment): Operator {
  const user = session.user;
  const meta = { ...(user.user_metadata ?? {}), ...(user.app_metadata ?? {}) } as Record<string, unknown>;
  const rawCats = Array.isArray(meta.categories) ? meta.categories : [];
  const categories = rawCats.filter((c): c is CategorySlug => typeof c === "string" && (CATEGORY_SLUGS as string[]).includes(c));
  return {
    id: user.id,
    full_name: typeof meta.full_name === "string" && meta.full_name.trim() ? meta.full_name.trim() : user.email ?? "Portal operator",
    email: user.email ?? "",
    segment,
    categories,
    on_duty: typeof meta.on_duty === "boolean" ? meta.on_duty : true,
    active_project_count: typeof meta.active_project_count === "number" ? meta.active_project_count : 0,
    average_rating: typeof meta.average_rating === "number" ? meta.average_rating : null,
    is_lead: Boolean(meta.is_lead),
    joined_at: user.created_at ?? new Date().toISOString(),
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [demoSegment, setDemoSegment] = useState<Segment | null>(() => (env.demoMode ? readStored() : null));
  const [liveState, setLiveState] = useState<{ operator: Operator | null; segment: Segment | null; loading: boolean; needsMfa: boolean }>({
    operator: null,
    segment: null,
    loading: !env.demoMode,
    needsMfa: false,
  });

  const queryClient = useQueryClient();

  const hydrateLive = useCallback(async () => {
    if (env.demoMode) return;
    try {
      const { data: sessionRes, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !sessionRes.session) {
        setLiveState({ operator: null, segment: null, loading: false, needsMfa: false });
        return;
      }

      const session = sessionRes.session;
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel !== "aal2") {
        setLiveState({ operator: null, segment: null, loading: false, needsMfa: true });
        return;
      }

      let liveOp: Operator | null = null;
      const claimSegment = parseSegment(session.user.app_metadata?.segment ?? session.user.user_metadata?.segment);

      // Try fetching authoritative operator profile when portal-api is live.
      try {
        const meUrl = resolvePortalUrl("/api/portal/me");
        const headers: Record<string, string> = {
          Accept: "application/json",
          Authorization: `Bearer ${session.access_token}`,
        };
        if (env.supabasePublishableKey) headers["apikey"] = env.supabasePublishableKey;
        const res = await fetch(meUrl, { headers });
        if (res.ok) {
          const data = (await res.json()) as Operator;
          if (parseSegment(data?.segment)) liveOp = data;
        }
      } catch {
        // Fallback to verified JWT claims below when Edge Function is not deployed yet.
      }

      if (!liveOp && claimSegment) {
        liveOp = operatorFromSession(session, claimSegment);
      }

      if (!liveOp) {
        setLiveState({ operator: null, segment: null, loading: false, needsMfa: false });
        return;
      }

      setLiveState({ operator: liveOp, segment: liveOp.segment, loading: false, needsMfa: false });
    } catch {
      setLiveState({ operator: null, segment: null, loading: false, needsMfa: false });
    }
  }, []);

  useEffect(() => {
    if (env.demoMode) return;
    void hydrateLive();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void hydrateLive();
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [hydrateLive]);

  const operator = useMemo(() => {
    if (!env.demoMode) return liveState.operator;
    if (!demoSegment) return null;
    return operators.find((o) => o.id === DEMO_IDENTITY[demoSegment]) ?? null;
  }, [demoSegment, liveState.operator]);

  const segment = env.demoMode ? demoSegment : liveState.segment;

  // Role-scoped theming: the primary hue follows the segment.
  useLayoutEffect(() => {
    document.documentElement.dataset.segment = segment ?? "supervisor";
  }, [segment]);

  const signIn = useCallback(
    (next: Segment) => {
      // A new identity never reads the previous one's cached data.
      queryClient.clear();
      try {
        sessionStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Private mode: the session lasts until reload.
      }
      setDemoSegment(next);
    },
    [queryClient],
  );

  const signOut = useCallback(() => {
    queryClient.clear();
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    if (env.demoMode) {
      setDemoSegment(null);
      return;
    }
    setLiveState({ operator: null, segment: null, loading: false, needsMfa: false });
    void supabase.auth.signOut();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      operator,
      segment,
      loading: env.demoMode ? false : liveState.loading,
      needsMfa: env.demoMode ? false : liveState.needsMfa,
      signIn,
      refreshSession: hydrateLive,
      signOut,
    }),
    [operator, segment, liveState.loading, liveState.needsMfa, signIn, hydrateLive, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

/** For screens behind RequireSession: the operator is guaranteed. */
export function useMe(): Operator & { segment: Segment } {
  const { operator } = useSession();
  if (!operator) throw new Error("useMe used outside a signed-in route");
  return operator;
}
