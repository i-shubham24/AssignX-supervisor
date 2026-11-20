import { Flag, MessageSquareWarning } from "lucide-react";
import type { Project } from "@/types/domain";
import { CategoryBadge, Code, UrgencyPill } from "@/components/portal/pills";
import { openFlags } from "./queues";
import { formatRelative } from "@/lib/datetime";
import { Tip } from "@/components/ui/overlay";

/** Code, title, category and urgency: the first column of every project queue. */
export function ProjectCell({ p, showClient = false }: { p: Project; showClient?: boolean }) {
  const flags = openFlags(p).length;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <Code>{p.code}</Code>
        <CategoryBadge category={p.category} short />
        <UrgencyPill urgency={p.urgency} hideStandard />
        {flags ? (
          <Tip content={`${flags} open flag${flags === 1 ? "" : "s"} from the client`}>
            <span className="inline-flex h-[22px] items-center gap-1 rounded-md bg-danger-bg px-1.5 text-[11px] font-bold text-danger-ink">
              <Flag className="h-3 w-3" aria-hidden="true" />
              {p.flag_count}/3
            </span>
          </Tip>
        ) : null}
        {p.held_count ? (
          <Tip content={`${p.held_count} message${p.held_count === 1 ? "" : "s"} on hold`}>
            <span className="inline-flex h-[22px] items-center gap-1 rounded-md bg-warning-bg px-1.5 text-[11px] font-bold text-warning-ink">
              <MessageSquareWarning className="h-3 w-3" aria-hidden="true" />
              {p.held_count}
            </span>
          </Tip>
        ) : null}
      </div>
      <div className="mt-1 truncate text-[13.5px] font-semibold text-ink group-hover:text-primary-ink">{p.title}</div>
      {showClient ? (
        <div className="mt-0.5 text-xs text-ink-3">
          {p.client.display_name} · {p.client.country}
        </div>
      ) : null}
    </div>
  );
}

export function Ago({ at }: { at: string | null | undefined }) {
  if (!at) return <span className="text-ink-3">Not yet</span>;
  return <span className="whitespace-nowrap text-ink-muted">{formatRelative(at)}</span>;
}
