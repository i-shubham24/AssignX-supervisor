import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "./portal";
import type { Channel, Segment } from "@/types/domain";
import { toUserError } from "@/lib/user-error";
import { useSession } from "@/providers/SessionProvider";
import { env } from "@/lib/env";

/** Every query key lives under one root so a mutation can refresh the whole portal. */
export const keys = {
  root: ["portal"] as const,
  operators: ["portal", "operators"] as const,
  projects: (actor: string) => ["portal", "projects", actor] as const,
  project: (id: string, actor: string) => ["portal", "project", id, actor] as const,
  messages: (id: string, channel: Channel) => ["portal", "messages", id, channel] as const,
  held: ["portal", "held"] as const,
  doers: ["portal", "doers"] as const,
  doer: (id: string) => ["portal", "doer", id] as const,
  doerProjects: (id: string, actor: string) => ["portal", "doer-projects", id, actor] as const,
  tickets: ["portal", "tickets"] as const,
  ticket: (id: string) => ["portal", "ticket", id] as const,
  verification: ["portal", "verification"] as const,
  refunds: ["portal", "refunds"] as const,
  training: ["portal", "training"] as const,
  rateBands: ["portal", "rate-bands"] as const,
  ledger: ["portal", "ledger"] as const,
  activity: ["portal", "activity"] as const,
  notifications: (segment: Segment) => ["portal", "notifications", segment] as const,
  disbursements: ["portal", "disbursements"] as const,
};

// Queues stay fresh via realtime broadcasts in live mode, with a periodic safety net.
const LIVE = { refetchInterval: env.demoMode ? 30_000 : 60_000 } as const;
const FAST_LIVE = { refetchInterval: env.demoMode ? 15_000 : 45_000 } as const;

export const useOperators = () => useQuery({ queryKey: keys.operators, queryFn: api.fetchOperators });
/** Projects are scoped to the signed-in operator, and so is their cache key. */
const useActor = () => useSession().operator?.id ?? "anonymous";
export const useProjects = () => {
  const actor = useActor();
  return useQuery({ queryKey: keys.projects(actor), queryFn: () => api.fetchProjects(actor), ...LIVE });
};
export const useProject = (id: string) => {
  const actor = useActor();
  return useQuery({ queryKey: keys.project(id, actor), queryFn: () => api.fetchProject(id, actor), ...LIVE, retry: false });
};
export const useMessages = (id: string, channel: Channel) =>
  useQuery({ queryKey: keys.messages(id, channel), queryFn: () => api.fetchMessages(id, channel), ...FAST_LIVE });
export const useHeld = () => useQuery({ queryKey: keys.held, queryFn: api.fetchHeld, ...FAST_LIVE });
export const useDoers = () => useQuery({ queryKey: keys.doers, queryFn: api.fetchDoers });
export const useProjectHistory = (id: string) => {
  const actor = useActor();
  return useQuery({ queryKey: ["portal", "history", id, actor], queryFn: () => api.fetchProjectHistory(id, actor) });
};
export const usePreferences = () => {
  const actor = useActor();
  return useQuery({ queryKey: ["portal", "prefs", actor], queryFn: () => api.fetchPreferences(actor) });
};
export const useDoer = (id: string) => useQuery({ queryKey: keys.doer(id), queryFn: () => api.fetchDoer(id) });
export const useDoerProjects = (id: string) => {
  const actor = useActor();
  return useQuery({ queryKey: keys.doerProjects(id, actor), queryFn: () => api.fetchDoerProjects(id, actor) });
};
type Opts = { enabled?: boolean };
export const useTickets = (o: Opts = {}) => useQuery({ queryKey: keys.tickets, queryFn: api.fetchTickets, ...LIVE, enabled: o.enabled ?? true });
export const useTicket = (id: string) => useQuery({ queryKey: keys.ticket(id), queryFn: () => api.fetchTicket(id) });
export const useVerification = (o: Opts = {}) => useQuery({ queryKey: keys.verification, queryFn: api.fetchVerification, enabled: o.enabled ?? true });
export const useRefunds = (o: Opts = {}) => useQuery({ queryKey: keys.refunds, queryFn: api.fetchRefunds, enabled: o.enabled ?? true });
export const useTraining = () => useQuery({ queryKey: keys.training, queryFn: api.fetchTraining });
export const useTrainingModule = (id: string) => useQuery({ queryKey: ["portal", "training", id], queryFn: () => api.fetchTrainingModule(id) });
export const useApplications = (o: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: ["portal", "applications"], queryFn: api.fetchApplications, enabled: o.enabled ?? true });
export const useWorkspaceLogins = () => useQuery({ queryKey: ["portal", "workspace-logins"], queryFn: api.fetchWorkspaceLogins });
export const useRateBands = () => useQuery({ queryKey: keys.rateBands, queryFn: api.fetchRateBands, staleTime: 10 * 60_000 });
export const useLedger = () => useQuery({ queryKey: keys.ledger, queryFn: api.fetchLedger });
export const useActivity = () => useQuery({ queryKey: keys.activity, queryFn: api.fetchActivity, ...LIVE });
export const useNotifications = (segment: Segment) =>
  useQuery({ queryKey: keys.notifications(segment), queryFn: () => api.fetchNotifications(segment), ...LIVE });
export const useDisbursements = (o: Opts = {}) => useQuery({ queryKey: keys.disbursements, queryFn: api.fetchDisbursements, enabled: o.enabled ?? true });

/**
 * A portal action: runs the call, toasts the outcome, refreshes every portal query.
 * Errors pass through toUserError so database detail never reaches the screen.
 */
export function useAction<TVars, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  opts: { success?: string | ((result: TResult, vars: TVars) => string); fallback?: string; onSuccess?: (result: TResult, vars: TVars) => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result, vars) => {
      const msg = typeof opts.success === "function" ? opts.success(result, vars) : opts.success;
      if (msg) toast.success(msg);
      opts.onSuccess?.(result, vars);
      void qc.invalidateQueries({ queryKey: keys.root });
    },
    onError: (error) => {
      toast.error(toUserError(error, opts.fallback ?? "That did not go through. Try again."));
    },
  });
}

/** A stable empty list, so `data ?? EMPTY` does not defeat useMemo dependencies. */
export const EMPTY: never[] = [];
