import { env } from "@/lib/env";
import { portalError } from "@/lib/user-error";
import { supabase } from "@/lib/supabase";

/**
 * The seam between screens and the backend.
 *
 * Every api function names the endpoint it stands for (PRD 18.5 paths) and passes a
 * demo implementation. In demo mode the demo store answers after a short, jittered
 * delay so loading states are real. With VITE_DEMO_MODE=false the call executes
 * against live backend services with the operator's JWT Bearer token.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface Endpoint {
  method: "GET" | "POST" | "PUT" | "PATCH";
  path: string;
}

export async function call<T>(
  endpoint: Endpoint,
  demo: () => T,
  latency = 180,
  body?: unknown,
): Promise<T> {
  if (env.demoMode) {
    await sleep(latency + Math.round(Math.random() * 140));
    return demo();
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(endpoint.path, {
      method: endpoint.method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errJson = (await res.json().catch(() => null)) as { message?: string } | null;
      throw portalError(
        errJson?.message || `${endpoint.method} ${endpoint.path} failed with HTTP ${res.status}`,
      );
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "PortalError") throw err;
    if (import.meta.env.DEV) {
      console.warn(`[Live Adapter] ${endpoint.path} unreachable. Falling back to local data.`, err);
      return demo();
    }
    throw portalError(
      `Failed to connect to ${endpoint.method} ${endpoint.path}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export const GET = (path: string): Endpoint => ({ method: "GET", path });
export const POST = (path: string): Endpoint => ({ method: "POST", path });
export const PATCH = (path: string): Endpoint => ({ method: "PATCH", path });
