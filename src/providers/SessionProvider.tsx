import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import type { Operator, Segment } from "@/types/domain";
import { operators, DEMO_IDENTITY } from "@/demo/seed";
import { env } from "@/lib/env";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Who is signed in, and which segment they hold.
 *
 * Live mode: the backend issues the session (email OTP plus mandatory TOTP, since
 * the existing schema only enforces aal2 in the app layer) and the segment arrives
 * as a JWT claim. Demo mode: the sign-in screen picks a segment and the session
 * lives in sessionStorage so it dies with the tab.
 */

interface SessionValue {
  operator: Operator | null;
  segment: Segment | null;
  signIn: (segment: Segment) => void;
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

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [segment, setSegment] = useState<Segment | null>(() => (env.demoMode ? readStored() : null));

  const operator = useMemo(() => {
    if (!segment) return null;
    return operators.find((o) => o.id === DEMO_IDENTITY[segment]) ?? null;
  }, [segment]);

  // Role-scoped theming: the primary hue follows the segment.
  useLayoutEffect(() => {
    document.documentElement.dataset.segment = segment ?? "supervisor";
  }, [segment]);

  const queryClient = useQueryClient();

  const signIn = useCallback((next: Segment) => {
    // A new identity never reads the previous one's cached data.
    queryClient.clear();
    try {
      sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the session lasts until reload.
    }
    setSegment(next);
  }, [queryClient]);

  const signOut = useCallback(() => {
    queryClient.clear();
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setSegment(null);
  }, [queryClient]);

  const value = useMemo(() => ({ operator, segment, signIn, signOut }), [operator, segment, signIn, signOut]);
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
