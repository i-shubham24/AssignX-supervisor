import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { env } from "./env";

/**
 * Realtime subscriptions for the Supervisor Portal.
 *
 * Three core rules:
 * 1. Every subscription channel is private and scoped to authenticated staff.
 * 2. setAuth() is called without arguments so Supabase automatically refreshes tokens.
 * 3. Delivery uses broadcast events from database triggers, preventing RLS leaks.
 */

export const topics = {
  thread: (threadId: string) => `thread:${threadId}`,
  project: (projectId: string) => `project:${projectId}`,
  notifications: (userId: string) => `notifications:${userId}`,
  moderation: "queue:moderation",
  stalled: "queue:stalled",
  disbursements: "queue:disbursements",
} as const;

type BroadcastHandler = (payload: unknown) => void;

export function subscribeToBroadcast(topic: string, events: string | string[], handler: BroadcastHandler): () => void {
  if (env.demoMode) return () => {};

  const eventList = Array.isArray(events) ? events : [events];
  let disposed = false;
  let cleanup: (() => void) | null = null;

  void (async () => {
    try {
      await supabase.realtime.setAuth();
      if (disposed) return;

      const channel = supabase.channel(topic, { config: { private: true } });
      for (const event of eventList) {
        channel.on("broadcast", { event }, (msg) => {
          handler(msg.payload);
        });
      }
      channel.subscribe();

      cleanup = () => {
        void supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn(`[Realtime] Failed to subscribe to ${topic}`, err);
    }
  })();

  return () => {
    disposed = true;
    cleanup?.();
  };
}

/**
 * Hook to stream messages for an open project thread.
 * Supports both unified thread UUIDs (matching Dolancer) and channel-scoped topics.
 */
export function useThreadRealtime(projectId: string | null, channelType: "client" | "internal", threadId?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId || env.demoMode) return;

    const topic = topics.thread(threadId ?? `${projectId}:${channelType}`);
    return subscribeToBroadcast(topic, ["INSERT", "new_message"], () => {
      void queryClient.invalidateQueries({ queryKey: ["portal", "messages", projectId, channelType] });
    });
  }, [projectId, channelType, threadId, queryClient]);
}

/**
 * Hook to stream queue events for the moderation queue.
 */
export function useModerationRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (env.demoMode) return;

    return subscribeToBroadcast(topics.moderation, ["held_message", "INSERT", "change"], () => {
      void queryClient.invalidateQueries({ queryKey: ["portal", "held"] });
      void queryClient.invalidateQueries({ queryKey: ["portal", "projects"] });
    });
  }, [queryClient]);
}

/**
 * Hook to stream live project updates (status changes, doer assignments).
 */
export function useProjectRealtime(projectId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId || env.demoMode) return;

    const topic = topics.project(projectId);
    return subscribeToBroadcast(topic, ["change", "status_changed"], () => {
      void queryClient.invalidateQueries({ queryKey: ["portal", "project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["portal", "projects"] });
      void queryClient.invalidateQueries({ queryKey: ["portal", "history", projectId] });
    });
  }, [projectId, queryClient]);
}

/**
 * Hook to stream operator notifications, matching Dolancer topic notifications:<userId>.
 */
export function useNotificationsRealtime(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || env.demoMode) return;

    return subscribeToBroadcast(topics.notifications(userId), ["new", "INSERT"], () => {
      void queryClient.invalidateQueries({ queryKey: ["portal", "notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["portal", "activity"] });
    });
  }, [userId, queryClient]);
}

/**
 * Hook to stream disbursement and stalled queue updates for QQD.
 */
export function useDisbursementsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (env.demoMode) return;

    const unsubDisb = subscribeToBroadcast(topics.disbursements, ["change", "INSERT"], () => {
      void queryClient.invalidateQueries({ queryKey: ["portal", "disbursements"] });
      void queryClient.invalidateQueries({ queryKey: ["portal", "ledger"] });
    });
    const unsubStalled = subscribeToBroadcast(topics.stalled, ["change", "INSERT"], () => {
      void queryClient.invalidateQueries({ queryKey: ["portal", "projects"] });
    });
    return () => {
      unsubDisb();
      unsubStalled();
    };
  }, [queryClient]);
}
