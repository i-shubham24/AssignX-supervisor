import { useEffect, useState } from "react";
import { Sun, Moon, Laptop } from "lucide-react";
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
import { cn } from "@/lib/cn";
import type { OperatorPreferences } from "@/types/domain";

/** Your account, appearance, how we reach you, and quiet hours. */
export default function SettingsPage() {
  const me = useMe();
  const { data } = usePreferences();
  const [prefs, setPrefs] = useState<OperatorPreferences | null>(null);

  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const density = useUiStore((s) => s.density);
  const setDensity = useUiStore((s) => s.setDensity);

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

        <Panel title="Look" sub="Theme and interface density">
          <div className="space-y-4">
            {/* Color Theme Selector */}
            <div>
              <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-3">Color Theme</div>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: "light", label: "Light", icon: Sun, desc: "Crisp daylight" },
                  { id: "dark", label: "Dark", icon: Moon, desc: "Low-light dim" },
                  { id: "system", label: "System", icon: Laptop, desc: "Matches device" },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = themeMode === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setThemeMode(t.id as "light" | "dark" | "system")}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all",
                        active
                          ? "border-primary bg-primary/5 text-ink ring-1 ring-primary shadow-xs"
                          : "border-line-card bg-surface hover:bg-hover hover:border-line text-ink-muted",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 mb-1", active ? "text-primary" : "text-ink-muted")} />
                      <span className="text-[12.5px] font-bold text-ink">{t.label}</span>
                      <span className="text-[10px] text-ink-3">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interface Density */}
            <div className="border-t border-line-subtle pt-3">
              <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-3">Interface Density</div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: "comfortable", label: "Comfortable", desc: "Spacious cards & generous margins" },
                  { id: "compact", label: "Compact", desc: "Tighter rows for high-volume shifts" },
                ].map((d) => {
                  const active = density === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDensity(d.id as "comfortable" | "compact")}
                      className={cn(
                        "flex flex-col rounded-xl border p-2.5 text-left transition-all",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                          : "border-line-card bg-surface hover:bg-hover hover:border-line",
                      )}
                    >
                      <span className="text-[12.5px] font-bold text-ink">{d.label}</span>
                      <span className="text-[10.5px] text-ink-muted">{d.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
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
