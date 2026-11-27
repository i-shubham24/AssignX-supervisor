import { useState } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { MotionConfig } from "framer-motion";
import { router } from "@/routes";
import { createQueryClient } from "@/lib/query-client";
import { SessionProvider } from "@/providers/SessionProvider";
import { TooltipProvider } from "@/components/ui/overlay";
import { DemoBanner } from "@/components/portal/DemoBanner";
import { ConfigErrorScreen } from "@/components/portal/ConfigErrorScreen";
import { env } from "@/lib/env";

export default function App() {
  const [queryClient] = useState(createQueryClient);
  if (env.configError) {
    return <ConfigErrorScreen />;
  }
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <MotionConfig reducedMotion="user">
          <TooltipProvider>
            <DemoBanner />
            <RouterProvider router={router} />
            <Toaster position="bottom-right" toastOptions={{ className: "!font-sans !text-[13px]" }} richColors closeButton />
          </TooltipProvider>
        </MotionConfig>
      </SessionProvider>
    </QueryClientProvider>
  );
}
