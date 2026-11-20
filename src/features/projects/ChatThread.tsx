import { useEffect, useMemo, useRef, useState } from "react";
import { Check, EyeOff, Lock, Paperclip, SendHorizontal, ShieldAlert, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Channel, Message, Project } from "@/types/domain";
import { EMPTY, useAction, useMessages } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { CATEGORIES, CLIENT_LABEL, MESSAGE_MAX, SLA } from "@/lib/config";
import { formatDateTime, formatTime } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { SlaClock, SkeletonRows, ErrorState, EmptyState } from "@/components/portal/kit";
import { SideTag } from "@/components/portal/pills";
import { toast } from "sonner";
import { CHAT_POLICY, checkUpload, cleanText, createRateLimiter } from "@/lib/input-safety";

const HELD_REASON = { contact_details: "Contact details", identity_reveal: "Identity reveal" } as const;

/** PRD 13.6: 20 messages per minute per user. The server enforces the real limit. */
const sendLimiter = createRateLimiter(20, 60_000);

/**
 * One project channel as portal staff see it: everything, including held and removed
 * messages with their reasons (FR-CH-012 keeps them for audit). What each party sees
 * is annotated, because the portal is the only place both views meet.
 */
export function ChatThread({ project, channel, className }: { project: Project; channel: Channel; className?: string }) {
  const me = useMe();
  const { data, isLoading, error, refetch } = useMessages(project.id, channel);
  const listRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const readOnly = project.status === "completed" || project.status === "cancelled";
  // Mirrors the backend posting rules, so nobody sees a composer that will refuse them.
  const blockedReason =
    channel === "internal" && me.segment === "support"
      ? "Support can read this chat but not post."
      : channel === "internal" && me.segment === "qqd"
        ? "QQD can read this chat but not post."
        : me.segment === "qqd" && project.supervisor_id
          ? "The supervisor runs this chat now."
          : me.segment === "supervisor" && project.supervisor_id !== me.id
            ? "Only the assigned supervisor can post."
            : null;

  const send = useAction(
    (body: string) => {
      const wait = sendLimiter.take();
      if (wait) throw new Error(`PORTAL: You are sending too fast. Wait ${Math.ceil(wait / 1000)} seconds.`);
      return api.sendMessage(project.id, channel, body, me.id, files);
    },
    {
      fallback: "Your message was not sent. It is still saved here.",
      onSuccess: () => {
        setDraft("");
        setFiles([]);
      },
    },
  );
  const canSend = Boolean(draft.trim() || files.length) && !send.isPending;
  const moderate = useAction((v: { id: string; decision: "approve" | "remove" }) => api.moderateMessage(v.id, v.decision, me.id), {
    success: (_r, v) => (v.decision === "approve" ? "Approved and delivered." : "Removed. The recipient never saw it."),
  });

  const messages = data ?? EMPTY;
  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  const grouped = useMemo(() => groupByDay(messages), [messages]);
  const isClient = channel === "client";

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className={cn("flex items-center gap-2 border-b px-4 py-2 text-xs", isClient ? "border-client/15 bg-client-light/50 text-client-ink" : "border-doer/15 bg-doer-light/50 text-doer-ink")}>
        {isClient ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
        {isClient ? (
          <span>
            The client sees you as <b>{CLIENT_LABEL.coordinator}</b> and doers by discipline only.
          </span>
        ) : (
          <span>
            The client never sees this chat. Doers see your first name only.
          </span>
        )}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto bg-surface-2/60 px-4 py-3" aria-live="polite" aria-relevant="additions">
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isLoading ? (
          <SkeletonRows rows={4} />
        ) : messages.length === 0 ? (
          <EmptyState title="No messages yet" body={isClient ? undefined : "Opens once a doer accepts."} />
        ) : (
          grouped.map(([day, items]) => (
            <div key={day}>
              <div className="my-3 flex items-center gap-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
                <span className="h-px flex-1 bg-line-card" />
                {day}
                <span className="h-px flex-1 bg-line-card" />
              </div>
              <ul className="space-y-2.5">
                {items.map((m) => (
                  <MessageRow
                    key={m.id}
                    m={m}
                    mine={m.sender_id === me.id}
                    onModerate={(decision) => moderate.mutate({ id: m.id, decision })}
                    busy={moderate.isPending && moderate.variables?.id === m.id}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {readOnly ? (
        <div className="border-t border-line-subtle bg-surface px-4 py-3 text-center text-xs font-medium text-ink-3">This project is {project.status}. Chat is closed.</div>
      ) : blockedReason ? (
        <div className="border-t border-line-subtle bg-surface px-4 py-3 text-center text-xs font-medium text-ink-3">{blockedReason}</div>
      ) : (
        <form
          className="border-t border-line-subtle bg-surface p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) send.mutate(draft);
          }}
        >
          <div className={cn("rounded-lg border bg-surface transition-[border-color,box-shadow] focus-within:ring-3", isClient ? "border-client/30 focus-within:border-client focus-within:ring-client/12" : "border-doer/30 focus-within:border-doer focus-within:ring-doer/12")}>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MESSAGE_MAX))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) send.mutate(draft);
                }
              }}
              rows={2}
              placeholder={isClient ? `Message the client as ${CLIENT_LABEL.coordinator}` : "Message the doer team"}
              aria-label={isClient ? "Message to the client" : "Message to the doer"}
              className="min-h-[60px] resize-none border-0 shadow-none focus-visible:ring-0"
            />
            {files.length ? (
              <div className="flex flex-wrap gap-1.5 px-3 pb-1">
                {files.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1 rounded-md bg-subtle px-2 py-1 text-[11.5px] font-medium">
                    <Paperclip className="h-3 w-3" aria-hidden="true" />
                    {f}
                    <button type="button" className="ml-0.5 text-ink-3 hover:text-danger-ink" aria-label={`Remove ${f}`} onClick={() => setFiles((x) => x.filter((y) => y !== f))}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
              <button type="button" className="rounded-md p-1.5 text-ink-3 hover:bg-hover hover:text-ink" aria-label="Attach a file" onClick={() => document.getElementById(`file-${project.id}-${channel}`)?.click()}>
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                id={`file-${project.id}-${channel}`}
                type="file"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  const problem = await checkUpload(f, CHAT_POLICY);
                  if (problem) toast.error(problem);
                  else if (files.length >= 5) toast.error("Attach up to five files per message.");
                  else setFiles((x) => [...x, cleanText(f.name, 200)]);
                }}
              />
              <SideTag side={isClient ? "client" : "doer"} />
              <span className={cn("ml-auto text-[11px] tabular", draft.length > MESSAGE_MAX * 0.9 ? "text-warning-ink" : "text-ink-3")}>
                {draft.length}/{MESSAGE_MAX}
              </span>
              <Button type="submit" size="sm" variant={isClient ? "client" : "doer"} loading={send.isPending} disabled={!canSend}>
                <SendHorizontal /> Send
              </Button>
            </div>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-ink-3">Enter to send. Shift+Enter for a new line.</p>
        </form>
      )}
    </div>
  );
}

function MessageRow({ m, mine, onModerate, busy }: { m: Message; mine: boolean; onModerate: (d: "approve" | "remove") => void; busy: boolean }) {
  if (m.sender_role === "system") {
    return (
      <li className="flex items-center gap-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
        <span className="h-px flex-1 bg-line-subtle" />
        <span title={formatDateTime(m.created_at)}>{m.body}</span>
        <span className="h-px flex-1 bg-line-subtle" />
      </li>
    );
  }

  const clientView =
    m.sender_role === "coordinator" ? CLIENT_LABEL.coordinator : m.sender_role === "expert" ? (m.discipline ? CATEGORIES[m.discipline].expert : "Expert") : m.sender_role === "support" ? CLIENT_LABEL.support : null;
  const held = m.state === "held";
  const removed = m.state === "removed";

  return (
    <li className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[82%]", removed && "opacity-60")}>
        <div className={cn("mb-1 flex items-center gap-1.5 text-[11.5px]", mine && "justify-end")}>
          <span className="font-bold text-ink-2">{m.sender_label}</span>
          {clientView && m.channel === "client" ? <span className="text-ink-3">client sees {clientView}</span> : null}
          <span className="text-ink-3">· {formatTime(m.created_at)}</span>
        </div>
        <div
          className={cn(
            "prose-plain rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
            mine ? "rounded-br-md bg-ink text-inverse" : m.sender_role === "client" ? "rounded-bl-md border border-client/20 bg-client-light/60" : m.sender_role === "expert" ? "rounded-bl-md border border-doer/20 bg-doer-light/60" : "rounded-bl-md border border-line-card bg-surface",
            held && "border-2 border-dashed border-warning-dot bg-warning-bg/70 text-ink",
            removed && "line-through decoration-ink-3/60",
          )}
        >
          {m.body}
          {m.attachments.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {m.attachments.map((a) => (
                <span key={a.id} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium", mine ? "bg-white/10" : "bg-subtle")}>
                  <Paperclip className="h-3 w-3" aria-hidden="true" />
                  {a.filename}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {held ? (
          <div className="mt-1.5 rounded-lg border border-warning-dot/40 bg-surface p-2.5 shadow-soft-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-warning-ink" aria-hidden="true" />
              <span className="text-[12px] font-bold text-warning-ink">On hold: {m.held_reason ? HELD_REASON[m.held_reason] : "Review"}</span>
              <SlaClock since={m.created_at} target={SLA.moderation.target} escalate={SLA.moderation.escalate} className="ml-auto" />
            </div>
            {m.screen_note ? <p className="mt-1 text-[12px] text-ink-muted">{m.screen_note}</p> : null}
            <p className="mt-1 text-[11.5px] text-ink-3">The recipient sees nothing. {m.sender_role === "client" ? "The client sees it as under review." : "The doer sees it blocked."}</p>
            <div className="mt-2 flex gap-2">
              <Button size="xs" variant="success" onClick={() => onModerate("approve")} loading={busy}>
                <Check /> Approve
              </Button>
              <Button size="xs" variant="danger-soft" onClick={() => onModerate("remove")} disabled={busy}>
                <Trash2 /> Remove
              </Button>
            </div>
          </div>
        ) : null}
        {m.state === "approved" || removed ? (
          <p className={cn("mt-1 text-[11px] text-ink-3", mine && "text-right")}>
            {removed ? "Removed after review" : "Approved after review"} {m.moderated_at ? `at ${formatTime(m.moderated_at)}` : ""}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function groupByDay(messages: Message[]): [string, Message[]][] {
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });
  const today = fmt.format(new Date());
  const map = new Map<string, Message[]>();
  for (const m of messages) {
    const label = fmt.format(new Date(m.created_at));
    const key = label === today ? "Today" : label;
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  return Array.from(map.entries());
}
