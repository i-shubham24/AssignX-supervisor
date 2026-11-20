import { useMemo, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { useOperators, useTickets } from "@/api/hooks";
import { useMe } from "@/providers/SessionProvider";
import { PageHeader, Panel, Segmented, SlaClock } from "@/components/portal/kit";
import { QueueTable } from "@/components/portal/QueueTable";
import { Code, Pill } from "@/components/portal/pills";
import { Ago } from "@/features/projects/cells";
import { TICKET_CATEGORY, TICKET_PRIORITY, TICKET_STATUS } from "@/lib/config";
import type { Ticket } from "@/types/domain";

type View = "open" | "mine" | "unassigned" | "closed";

const SOURCE: Record<Ticket["source"], string> = {
  contact_form: "Contact form",
  in_app: "In-app help",
  project_link: "Project help link",
  third_flag: "Third flag",
  doer_report: "Doer report",
  supervisor_escalation: "Supervisor escalation",
};

/** Every complaint, dispute and escalation across both brands (PRD 11.3). */
export default function TicketsPage() {
  const me = useMe();
  const { data, isLoading, error, refetch } = useTickets();
  const operators = useOperators().data ?? [];
  const [view, setView] = useState<View>("open");
  const all = data ?? [];
  const views: Record<View, (t: Ticket) => boolean> = {
    open: (t) => TICKET_STATUS[t.status].open,
    mine: (t) => TICKET_STATUS[t.status].open && t.owner_id === me.id,
    unassigned: (t) => TICKET_STATUS[t.status].open && !t.owner_id,
    closed: (t) => !TICKET_STATUS[t.status].open,
  };
  const rows = useMemo(() => all.filter(views[view]).sort((a, b) => TICKET_PRIORITY[a.priority].rank - TICKET_PRIORITY[b.priority].rank || a.created_at.localeCompare(b.created_at)), [all, view]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader title="Tickets" />
      <Segmented className="mb-4 max-w-full overflow-x-auto whitespace-nowrap" aria-label="Ticket view" value={view} onChange={setView} options={(["open", "mine", "unassigned", "closed"] as View[]).map((v) => ({ value: v, label: v === "mine" ? "Assigned to me" : v[0]!.toUpperCase() + v.slice(1), count: all.filter(views[v]).length }))} />
      <Panel padded={false}>
        <QueueTable
          caption="Tickets"
          rows={isLoading ? undefined : rows}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          rowKey={(t) => t.id}
          href={(t) => `/tickets/${t.id}`}
          rowClassName={(t) => (t.priority === "critical" && TICKET_STATUS[t.status].open ? "bg-danger-bg/30" : undefined)}
          empty={{ icon: <LifeBuoy />, title: "No tickets in this view" }}
          columns={[
            {
              key: "t",
              header: "Ticket",
              cell: (t) => (
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><Code>{t.reference}</Code><span className="text-[11.5px] text-ink-3">{SOURCE[t.source]}</span>{t.project_code ? <Code>{t.project_code}</Code> : null}</div>
                  <div className="mt-0.5 truncate text-[13.5px] font-semibold">{t.subject}</div>
                  <div className="text-xs text-ink-3">{t.requester.role === "doer" ? "Doer" : t.requester.role === "client" ? "Client" : "Internal"}: {t.requester.label}</div>
                </div>
              ),
            },
            { key: "c", header: "Category", width: "150px", cell: (t) => <span className="text-[13px]">{TICKET_CATEGORY[t.category]}</span> },
            { key: "p", header: "Priority", width: "110px", sort: (t) => TICKET_PRIORITY[t.priority].rank, cell: (t) => <Pill tone={TICKET_PRIORITY[t.priority].tone}>{TICKET_PRIORITY[t.priority].label}</Pill> },
            { key: "s", header: "Status", width: "160px", cell: (t) => <Pill tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Pill> },
            { key: "o", header: "Owner", width: "140px", cell: (t) => <span className="text-[13px]">{operators.find((o) => o.id === t.owner_id)?.full_name ?? <span className="text-ink-3">Unassigned</span>}</span> },
            {
              key: "sla",
              header: "Due",
              width: "140px",
              cell: (t) =>
                !TICKET_STATUS[t.status].open ? (
                  <Ago at={t.resolved_at} />
                ) : !t.first_response_at ? (
                  <SlaClock since={t.created_at} target={TICKET_PRIORITY[t.priority].firstResponse} escalate={TICKET_PRIORITY[t.priority].firstResponse * 1.5} />
                ) : (
                  <SlaClock since={t.created_at} target={TICKET_PRIORITY[t.priority].resolution} escalate={TICKET_PRIORITY[t.priority].resolution * 1.25} />
                ),
            },
          ]}
        />
      </Panel>
    </>
  );
}
