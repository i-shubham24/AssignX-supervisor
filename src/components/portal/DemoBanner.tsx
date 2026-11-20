import { AlertTriangle } from "lucide-react";
import { env } from "@/lib/env";

/**
 * A production build running on sample data must never pass for the real portal.
 * Shown on every screen, including sign-in, whenever demoInProduction is true.
 */
export function DemoBanner() {
  if (!env.demoInProduction) return null;
  return (
    <div role="alert" className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-warning-dot px-4 py-1.5 text-[12.5px] font-bold text-ink">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      Demo build on sample data. Not connected to AssignX systems. Do not enter real client or doer information.
    </div>
  );
}
