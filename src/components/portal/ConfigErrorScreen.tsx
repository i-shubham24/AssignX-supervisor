import { AlertTriangle, ShieldAlert } from "lucide-react";
import { env } from "@/lib/env";

/**
 * Fail-closed configuration screen rendered instead of mounting the portal
 * whenever a production build lacks backend environment variables or detects
 * a privileged key in client configuration.
 */
export function ConfigErrorScreen() {
  const isPrivileged = Boolean(env.privilegedKeyError);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10 text-ink">
      <section className="w-full max-w-lg rounded-2xl border border-line-card bg-surface p-6 shadow-soft-md sm:p-8">
        <div className="flex items-start gap-3">
          <div
            className={
              isPrivileged
                ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-bg text-danger-ink"
                : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-bg text-warning-ink"
            }
          >
            {isPrivileged ? <ShieldAlert className="h-5 w-5" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5" aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">AssignX Supervisor Portal</p>
            <h1 className="mt-1 text-xl font-extrabold tracking-[-0.025em]">
              {isPrivileged ? "Blocked unsafe client key" : "Backend configuration required"}
            </h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink-2">
          {isPrivileged
            ? env.privilegedKeyError
            : "This production build is failing closed because backend connection variables are not set on the host."}
        </p>

        {!isPrivileged && env.missingVars.length > 0 ? (
          <div className="mt-5 space-y-3 rounded-xl border border-line-subtle bg-canvas p-4 text-[13px] text-ink-2">
            <div>
              <p className="font-bold text-ink">Missing environment variables</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 font-mono text-xs text-ink-2">
                {env.missingVars.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>

            <div className="border-t border-line-subtle pt-3">
              <p className="font-bold text-ink">How to finish setup on Vercel</p>
              <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-ink-2">
                <li>
                  For live operation, open Project Settings &rarr; Environment Variables and add{" "}
                  <code className="font-mono font-semibold text-ink">VITE_SUPABASE_URL</code> and{" "}
                  <code className="font-mono font-semibold text-ink">VITE_SUPABASE_PUBLISHABLE_KEY</code>, then redeploy.
                </li>
                <li>
                  For a sample-data preview without a live backend, set{" "}
                  <code className="font-mono font-semibold text-ink">VITE_DEMO_MODE=true</code> (or set the Build Command to{" "}
                  <code className="font-mono font-semibold text-ink">npm run build:demo</code>), then redeploy.
                </li>
              </ol>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
