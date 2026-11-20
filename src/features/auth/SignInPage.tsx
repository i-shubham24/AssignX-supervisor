import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSession } from "@/providers/SessionProvider";
import { env } from "@/lib/env";
import { SEGMENTS } from "@/lib/config";
import type { Segment } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

const SEGMENT_DOT: Record<Segment, string> = {
  qqd: "bg-[#10b981]",
  supervisor: "bg-[#6366f1]",
  support: "bg-[#f59e0b]",
};

/**
 * Sign-in: work email, email code, then authenticator app (two-step is required for
 * every portal account). In demo mode the segment picker stands in for the session.
 */
export default function SignInPage() {
  const { operator, signIn } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code" | "mfa">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (operator) return <Navigate to="/" replace />;

  const enter = (segment: Segment) => {
    signIn(segment);
    navigate("/", { replace: true });
  };

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter your work email.");
      return;
    }
    setError(null);
    if (env.demoMode) {
      setStep("code");
      return;
    }
    toast.error("Sign-in isn't connected yet.");
  };

  return (
    <div className={cn("grid min-h-dvh grid-cols-1 bg-canvas lg:grid-cols-2", env.demoInProduction && "pt-8")}>
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-white lg:flex">
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(238,107,80,0.4),transparent_65%)]" />
        <div className="relative text-[18px] font-extrabold tracking-[-0.02em]">
          AssignX<span className="text-primary">.</span> <span className="font-medium text-white/60">Supervisor portal</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-[34px] font-extrabold leading-[1.12] tracking-[-0.035em]">Quote, staff, check and deliver. All in one place.</h1>
          <p className="mt-4 text-[15px] text-white/70">For AssignX staff only.</p>
          <ul className="mt-8 space-y-3">
            {(Object.keys(SEGMENTS) as Segment[]).map((s) => (
              <li key={s} className="flex items-start gap-3">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", SEGMENT_DOT[s])} aria-hidden="true" />
                <span>
                  <span className="block text-[14px] font-bold">{SEGMENTS[s].long}</span>
                  <span className="block text-[13px] text-white/60">{SEGMENTS[s].blurb}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[12px] text-white/50">Sign-in needs an email code and your authenticator app.</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:p-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[400px]">
          <div className="mb-8 text-[18px] font-extrabold tracking-[-0.02em] lg:hidden">
            AssignX<span className="text-primary">.</span> <span className="font-medium text-ink-3">Supervisor portal</span>
          </div>
          <h2 className="text-[22px] font-extrabold tracking-[-0.025em]">Sign in</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {step === "email" ? "Use your AssignX work email." : step === "code" ? `We sent a code to ${email}.` : "Open your authenticator app."}
          </p>

          {step === "email" ? (
            <form onSubmit={submitEmail} className="mt-6 space-y-4" noValidate>
              <Field label="Work email" error={error}>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} type="email" autoComplete="email" placeholder="name@assignx.in" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} autoFocus />
                )}
              </Field>
              <Button type="submit" variant="dark" size="lg" className="w-full">
                Continue <ArrowRight />
              </Button>
            </form>
          ) : step === "code" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!/^\d{6}$/.test(code)) {
                  setError("Enter the 6-digit code.");
                  return;
                }
                setError(null);
                setStep("mfa");
              }}
              className="mt-6 space-y-4"
              noValidate
            >
              <Field label="Email code" hint={env.demoMode ? "Demo: any 6 digits work." : undefined} error={error}>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} aria-describedby={describedBy} aria-invalid={invalid} autoFocus className="font-mono tracking-[0.4em]" />
                )}
              </Field>
              <Button type="submit" variant="dark" size="lg" className="w-full">
                Continue
              </Button>
              <button type="button" onClick={() => setStep("email")} className="w-full text-center text-xs font-semibold text-ink-muted hover:text-ink">
                Use a different email
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!/^\d{6}$/.test(totp)) {
                  setError("Enter the 6-digit code from your app.");
                  return;
                }
                setError(null);
                toast.message(env.demoMode ? "Demo: pick a role below." : "Authenticator check isn't connected yet.");
              }}
              className="mt-6 space-y-4"
              noValidate
            >
              <Field label="Authenticator code" hint={env.demoMode ? "Demo: any 6 digits work." : undefined} error={error}>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={totp} onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))} aria-describedby={describedBy} aria-invalid={invalid} autoFocus className="font-mono tracking-[0.4em]" />
                )}
              </Field>
              <Button type="submit" variant="dark" size="lg" className="w-full">
                Sign in
              </Button>
            </form>
          )}

          {env.demoMode ? (
            <div className="mt-8">
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
                <span className="h-px flex-1 bg-line-card" />
                Demo: sign in as
                <span className="h-px flex-1 bg-line-card" />
              </div>
              <div className="mt-3 space-y-2">
                {(["supervisor", "qqd", "support"] as Segment[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => enter(s)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-line-card bg-surface px-4 py-3 text-left shadow-soft-sm transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-line hover:shadow-soft-md"
                  >
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", SEGMENT_DOT[s])} aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-sm font-bold">{SEGMENTS[s].long}</span>
                    <ArrowRight className="h-4 w-4 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </motion.div>
      </main>
    </div>
  );
}
