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
  moderation: "queue:moderation",
  stalled: "queue:stalled",
  disbursements: "queue:disbursements",
} as const;

type BroadcastHandler = (payload: unknown) => void;

export function subscribeToBroadcast(topic: string, event: string, handler: BroadcastHandler): () => void {
  if (env.demoMode) return () => {};

  let disposed = false;
  let cleanup: (() => void) | null = null;

  void (async () => {
    try {
      await supabase.realtime.setAuth();
      if (disposed) return;

      const channel = supabase.channel(topic, { config: { private: true } });
      channel.on("broadcast", { event }, (msg) => {
        handler(msg.payload);
      });
      channel.subscribe();

      cleanup = () => {
        void supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn(`[Realtime] Failed to subscribe to ${topic}:${event}`, err);
    }
  })();

  return () => {
    disposed = true;
    cleanup?.();
  };
}

/**
 * Hook to stream messages for an open project thread.
 * Automatically invalidates query cache when a new message arrives.
 */
export function useThreadRealtime(projectId: string | null, channelType: "client" | "internal") {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId || env.demoMode) return;

    const topic = topics.thread(`${projectId}:${channelType}`);
    return subscribeToBroadcast(topic, "new_message", () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", projectId, channelType] });
    });
  }, [projectId, channelType, queryClient]);
}

/**
 * Hook to stream queue events for the moderation queue.
 */
export function useModerationRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (env.demoMode) return;

    return subscribeToBroadcast(topics.moderation, "held_message", () => {
      void queryClient.invalidateQueries({ queryKey: ["held"] });
      void queryClient.invalidateQueries({ queryKey: ["counts"] });
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
    return subscribeToBroadcast(topic, "status_changed", () => {
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    });
  }, [projectId, queryClient]);
}
