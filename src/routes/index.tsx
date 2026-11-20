import { createBrowserRouter, Navigate, Outlet, useRouteError } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { PortalShell } from "@/layouts/PortalShell";
import { useSession } from "@/providers/SessionProvider";
import type { Segment } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/portal/kit";
import { Compass, ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";

const SignInPage = lazyWithRetry(() => import("@/features/auth/SignInPage"));
const OverviewPage = lazyWithRetry(() => import("@/features/overview/OverviewPage"));
const SupervisorChecksPage = lazyWithRetry(() => import("@/features/qqd/SupervisorChecksPage"));
const LoginsPage = lazyWithRetry(() => import("@/features/qqd/LoginsPage"));
const TrainingEditorPage = lazyWithRetry(() => import("@/features/qqd/TrainingEditorPage"));
const SettingsPage = lazyWithRetry(() => import("@/features/settings/SettingsPage"));
const StalledPage = lazyWithRetry(() => import("@/features/qqd/StalledPage"));
const QuoteQueuePage = lazyWithRetry(() => import("@/features/qqd/QuoteQueuePage"));
const QuoteComposerPage = lazyWithRetry(() => import("@/features/qqd/QuoteComposerPage"));
const AssignmentPage = lazyWithRetry(() => import("@/features/qqd/AssignmentPage"));
const DisbursementPage = lazyWithRetry(() => import("@/features/qqd/DisbursementPage"));
const RefundsPage = lazyWithRetry(() => import("@/features/qqd/RefundsPage"));
const VerificationPage = lazyWithRetry(() => import("@/features/qqd/VerificationPage"));
const PeoplePage = lazyWithRetry(() => import("@/features/qqd/PeoplePage"));
const TrainingPage = lazyWithRetry(() => import("@/features/qqd/TrainingPage"));
const RatesPage = lazyWithRetry(() => import("@/features/qqd/RatesPage"));
const LedgerPage = lazyWithRetry(() => import("@/features/qqd/LedgerPage"));
const ActivePage = lazyWithRetry(() => import("@/features/supervisor/ActivePage"));
const SourcingPage = lazyWithRetry(() => import("@/features/supervisor/SourcingPage"));
const QcQueuePage = lazyWithRetry(() => import("@/features/supervisor/QcQueuePage"));
const QcReviewPage = lazyWithRetry(() => import("@/features/supervisor/QcReviewPage"));
const DoersPage = lazyWithRetry(() => import("@/features/supervisor/DoersPage"));
const DoerProfilePage = lazyWithRetry(() => import("@/features/supervisor/DoerProfilePage"));
const OnboardingPage = lazyWithRetry(() => import("@/features/supervisor/OnboardingPage"));
const PerformancePage = lazyWithRetry(() => import("@/features/supervisor/PerformancePage"));
const ModerationPage = lazyWithRetry(() => import("@/features/moderation/ModerationPage"));
const ProjectWorkspace = lazyWithRetry(() => import("@/features/projects/ProjectWorkspace"));
const AllProjectsPage = lazyWithRetry(() => import("@/features/projects/AllProjectsPage"));
const TicketsPage = lazyWithRetry(() => import("@/features/support/TicketsPage"));
const TicketDetailPage = lazyWithRetry(() => import("@/features/support/TicketDetailPage"));

function RequireSession() {
  const { operator } = useSession();
  if (!operator) return <Navigate to="/sign-in" replace />;
  return <Outlet />;
}

/** UI guard only. The backend refuses the same calls for the wrong segment. */
function RequireSegment({ allow }: { allow: Segment[] }) {
  const { segment } = useSession();
  if (!segment || !allow.includes(segment)) {
    return (
      <EmptyState
        icon={<ShieldOff />}
        title="Not available for your role"
        body="This area belongs to another segment of the portal."
        action={
          <Button asChild size="sm">
            <Link to="/">Back to overview</Link>
          </Button>
        }
      />
    );
  }
  return <Outlet />;
}

function RouteError() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-8">
      <EmptyState
        icon={<Compass />}
        title="Something broke on this page"
        body="Reload to try again. If it keeps happening, tell the platform team what you were doing."
        action={<Button onClick={() => window.location.reload()}>Reload</Button>}
      />
    </div>
  );
}

function NotFound() {
  return (
    <EmptyState
      icon={<Compass />}
      title="Page not found"
      body="That address does not exist, or the item belongs to someone else."
      action={
        <Button asChild size="sm">
          <Link to="/">Back to overview</Link>
        </Button>
      }
    />
  );
}

export const router = createBrowserRouter([
  { path: "/sign-in", element: <SignInPage />, errorElement: <RouteError /> },
  {
    element: <RequireSession />,
    errorElement: <RouteError />,
    children: [
      {
        element: <PortalShell />,
        children: [
          { index: true, element: <OverviewPage /> },
          // Scoped server-side: a supervisor only ever receives their own projects.
          { path: "projects/:id", element: <ProjectWorkspace /> },
          { path: "moderation", element: <ModerationPage /> },
          { path: "settings", element: <SettingsPage /> },
          {
            element: <RequireSegment allow={["qqd"]} />,
            children: [
              { path: "stalled", element: <StalledPage /> },
              { path: "supervisor-checks", element: <SupervisorChecksPage /> },
              { path: "logins", element: <LoginsPage /> },
              { path: "training/:id", element: <TrainingEditorPage /> },
              { path: "quotes", element: <QuoteQueuePage /> },
              { path: "quotes/:id", element: <QuoteComposerPage /> },
              { path: "assignment", element: <AssignmentPage /> },
              { path: "disbursement", element: <DisbursementPage /> },
              { path: "refunds", element: <RefundsPage /> },
              { path: "verification", element: <VerificationPage /> },
              { path: "people", element: <PeoplePage /> },
              { path: "training", element: <TrainingPage /> },
              { path: "rates", element: <RatesPage /> },
              { path: "ledger", element: <LedgerPage /> },
            ],
          },
          {
            element: <RequireSegment allow={["supervisor", "qqd"]} />,
            children: [
              { path: "doers", element: <DoersPage /> },
              { path: "doers/:id", element: <DoerProfilePage /> },
            ],
          },
          {
            element: <RequireSegment allow={["supervisor"]} />,
            children: [
              { path: "active", element: <ActivePage /> },
              { path: "sourcing", element: <SourcingPage /> },
              { path: "qc", element: <QcQueuePage /> },
              { path: "qc/:id", element: <QcReviewPage /> },
              { path: "onboarding", element: <OnboardingPage /> },
              { path: "performance", element: <PerformancePage /> },
            ],
          },
          {
            element: <RequireSegment allow={["support", "qqd"]} />,
            children: [
              { path: "projects", element: <AllProjectsPage /> },
              { path: "tickets", element: <TicketsPage /> },
              { path: "tickets/:id", element: <TicketDetailPage /> },
            ],
          },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);
