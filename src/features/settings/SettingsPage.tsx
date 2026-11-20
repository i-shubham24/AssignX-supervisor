import { useEffect, useState } from "react";
import { useAction, usePreferences } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { useUiStore } from "@/stores/useUiStore";
import { KeyValue, PageHeader, Panel } from "@/components/portal/kit";
import { CategoryBadge } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { SEGMENTS } from "@/lib/config";
import { formatDate } from "@/lib/datetime";
import type { OperatorPreferences } from "@/types/domain";

/** Your account, how we reach you, and quiet hours. */
export default function SettingsPage() {
  const me = useMe();
  const { data } = usePreferences();
  const [prefs, setPrefs] = useState<OperatorPreferences | null>(null);
  const dark = useUiStore((s) => s.dark);
  const toggleDark = useUiStore((s) => s.toggleDark);

  useEffect(() => {
    if (data && !prefs) setPrefs(data);
  }, [data, prefs]);

  const save = useAction(() => api.savePreferences(me.id, prefs!), { success: "Saved." });
  const set = (patch: Partial<OperatorPreferences>) => setPrefs((p) => (p ? { ...p, ...patch } : p));

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Your account">
          <KeyValue
            items={[
              { k: "Name", v: me.full_name },
              { k: "Email", v: me.email },
              { k: "Role", v: `${SEGMENTS[me.segment].long}${me.is_lead ? " (lead)" : ""}` },
              { k: "Joined", v: formatDate(me.joined_at) },
            ]}
          />
          {me.categories.length ? (
            <div className="mt-4">
              <div className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-3">Your categories</div>
              <div className="flex flex-wrap gap-1">{me.categories.map((c) => <CategoryBadge key={c} category={c} />)}</div>
              <p className="mt-2 text-xs text-ink-3">Ask your QQD lead to change these.</p>
            </div>
          ) : null}
          <p className="mt-4 text-xs text-ink-3">Two-step sign-in is always on for portal accounts.</p>
        </Panel>

        <Panel title="Look">
          <Checkbox checked={dark} onChange={() => toggleDark()} label="Dark mode" />
        </Panel>

        <Panel title="How we reach you" className="xl:col-span-2">
          {!prefs ? (
            <div className="skeleton h-32" />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-1">
                <Checkbox checked={prefs.notify_in_app} onChange={(v) => set({ notify_in_app: v })} label="In the portal" />
                <Checkbox checked={prefs.notify_email} onChange={(v) => set({ notify_email: v })} label="Email" />
                <Checkbox checked={prefs.notify_whatsapp} onChange={(v) => set({ notify_whatsapp: v })} label="WhatsApp" />
                <Checkbox checked={prefs.notify_push} onChange={(v) => set({ notify_push: v })} label="Browser notifications" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-ink-2">Quiet hours</div>
                <p className="text-xs text-ink-3">No alerts in this window. Leave empty for none.</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <Field label="From">{({ id }) => <Input id={id} type="time" value={prefs.quiet_from ?? ""} onChange={(e) => set({ quiet_from: e.target.value || null })} />}</Field>
                  <Field label="To">{({ id }) => <Input id={id} type="time" value={prefs.quiet_to ?? ""} onChange={(e) => set({ quiet_to: e.target.value || null })} />}</Field>
                </div>
                <Checkbox className="mt-2" checked={prefs.urgent_breaks_quiet} onChange={(v) => set({ urgent_breaks_quiet: v })} label="Still alert me for urgent items" description="Late work, client flags and critical tickets" />
              </div>
            </div>
          )}
          <Button variant="primary" className="mt-5" disabled={!prefs} loading={save.isPending} onClick={() => save.mutate(undefined)}>
            Save
          </Button>
        </Panel>
      </div>
    </>
  );
}
