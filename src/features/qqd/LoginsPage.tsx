import { Link } from "react-router-dom";
import { KeyRound, Plus } from "lucide-react";
import { useAction, useWorkspaceLogins } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { PageHeader, Panel, ProgressBar } from "@/components/portal/kit";
import { QueueTable } from "@/components/portal/QueueTable";
import { Code, Pill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/datetime";

/**
 * The pool of anonymous company workspace logins (PRD 11.2 DEV note). Each doer
 * gets one per project, so their own accounts never touch client work.
 */
export default function LoginsPage() {
  const me = useMe();
  const { data, isLoading, error, refetch } = useWorkspaceLogins();
  const rows = data ?? [];
  const used = rows.filter((r) => r.in_use).length;
  const add = useAction(() => api.addWorkspaceLogins(10, me.id), { success: "Added 10 logins." });
  const nearlyFull = rows.length > 0 && used / rows.length > 0.8;

  return (
    <>
      <PageHeader
        title="Workspace logins"
        sub="Doers use these to open company workspaces. One per doer per project."
        actions={
          <Button variant="primary" loading={add.isPending} onClick={() => add.mutate(undefined)}>
            <Plus /> Add 10 logins
          </Button>
        }
      />
      <Panel className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <span>
            <b className="tabular">{used}</b> of <b className="tabular">{rows.length}</b> in use
          </span>
          {nearlyFull ? <Pill tone="warning">Nearly full. Add more.</Pill> : null}
        </div>
        <ProgressBar value={rows.length ? (used / rows.length) * 100 : 0} tone={nearlyFull ? "warning" : "primary"} className="mt-2 h-2" />
      </Panel>
      <Panel padded={false}>
        <QueueTable
          caption="Workspace logins"
          rows={isLoading ? undefined : [...rows].sort((a, b) => Number(Boolean(b.in_use)) - Number(Boolean(a.in_use)))}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          rowKey={(r) => r.login}
          empty={{ icon: <KeyRound />, title: "No logins yet" }}
          columns={[
            { key: "l", header: "Login", cell: (r) => <span className="font-mono text-[12.5px] text-ink">{r.login}</span> },
            { key: "s", header: "Status", width: "120px", cell: (r) => <Pill tone={r.in_use ? "primary" : "neutral"}>{r.in_use ? "In use" : "Free"}</Pill> },
            {
              key: "p",
              header: "Used for",
              cell: (r) =>
                r.in_use ? (
                  <Link to={`/projects/${r.in_use.project_id}`} className="flex items-center gap-2 hover:underline">
                    <Code>{r.in_use.project_code}</Code>
                    <span className="font-mono text-xs font-semibold">{r.in_use.doer_code}</span>
                  </Link>
                ) : (
                  <span className="text-ink-3">Free</span>
                ),
            },
            { key: "t", header: "Since", width: "130px", cell: (r) => <span className="text-ink-muted">{r.in_use?.since ? formatRelative(r.in_use.since) : ""}</span> },
          ]}
        />
      </Panel>
    </>
  );
}
