import { env } from "@/lib/env";
import { portalError } from "@/lib/user-error";

/**
 * The seam between screens and the backend.
 *
 * Every api function names the endpoint it stands for (PRD 18.5 paths) and passes a
 * demo implementation. In demo mode the demo store answers after a short, jittered
 * delay so loading states are real. With VITE_DEMO_MODE=false the call fails with a
 * clear message naming the endpoint until the backend team wires it, which makes
 * this folder the exact handoff list: implement the endpoint, replace the throw.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface Endpoint {
  method: "GET" | "POST" | "PUT" | "PATCH";
  path: string;
}

export async function call<T>(endpoint: Endpoint, demo: () => T, latency = 180): Promise<T> {
  if (env.demoMode) {
    await sleep(latency + Math.round(Math.random() * 140));
    return demo();
  }
  throw portalError(`${endpoint.method} ${endpoint.path} is not connected yet. The backend team owns this endpoint.`);
}

export const GET = (path: string): Endpoint => ({ method: "GET", path });
export const POST = (path: string): Endpoint => ({ method: "POST", path });
export const PATCH = (path: string): Endpoint => ({ method: "PATCH", path });
