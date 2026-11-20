import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, FileText, LifeBuoy, Search, User } from "lucide-react";
import { useUiStore } from "@/stores/useUiStore";
import { useMe } from "@/providers/SessionProvider";
import { NAV } from "@/routes/nav";
import { useDoers, useProjects, useTickets } from "@/api/hooks";
import { STATUS } from "@/lib/config";

/** Ctrl or Cmd K: jump to any page, project, doer or ticket the segment can reach. */
export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const me = useMe();
  const navigate = useNavigate();
  const projects = useProjects().data ?? [];
  const doers = useDoers().data ?? [];
  const tickets = useTickets().data ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUiStore.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  const visibleProjects = me.segment === "supervisor" ? projects.filter((p) => p.supervisor_id === me.id) : projects;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-[14vh] z-50 w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-line-card bg-surface shadow-soft-lg" aria-label="Command palette">
          <Dialog.Title className="sr-only">Search the portal</Dialog.Title>
          <Dialog.Description className="sr-only">Type to search pages, projects, doers and tickets.</Dialog.Description>
          <Command label="Search the portal" loop>
            <div className="flex items-center gap-2 border-b border-line-subtle px-4">
              <Search className="h-4 w-4 text-ink-3" aria-hidden="true" />
              <Command.Input autoFocus placeholder="Type a project code, title, doer code, ticket or page" className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3" />
            </div>
            <Command.List className="max-h-[400px] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-ink-3">
              <Command.Empty className="px-3 py-8 text-center text-sm text-ink-3">No matches.</Command.Empty>
              <Command.Group heading="Go to">
                {NAV[me.segment].map((item) => (
                  <Item key={item.to} value={`page ${item.label}`} onSelect={() => go(item.to)} icon={<item.icon />}>
                    {item.label}
                  </Item>
                ))}
              </Command.Group>
              {visibleProjects.length ? (
                <Command.Group heading="Projects">
                  {visibleProjects.map((p) => (
                    <Item key={p.id} value={`${p.code} ${p.title}`} onSelect={() => go(p.status === "awaiting_quote" && me.segment === "qqd" ? `/quotes/${p.id}` : `/projects/${p.id}`)} icon={<FileText />}>
                      <span className="font-mono text-xs text-ink-3">{p.code}</span>
                      <span className="truncate">{p.title}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-ink-3">{STATUS[p.status].label}</span>
                    </Item>
                  ))}
                </Command.Group>
              ) : null}
              {me.segment !== "support" ? (
                <Command.Group heading="Doers">
                  {doers.map((d) => (
                    <Item key={d.id} value={`${d.doer_code} ${d.full_name} ${d.sub_categories.join(" ")}`} onSelect={() => go(`/doers/${d.id}`)} icon={<User />}>
                      <span className="font-mono text-xs text-ink-3">{d.doer_code}</span>
                      <span className="truncate">{d.full_name}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-ink-3">Level {d.level}</span>
                    </Item>
                  ))}
                </Command.Group>
              ) : null}
              {me.segment !== "supervisor" ? (
                <Command.Group heading="Tickets">
                  {tickets.map((t) => (
                    <Item key={t.id} value={`${t.reference} ${t.subject}`} onSelect={() => go(`/tickets/${t.id}`)} icon={<LifeBuoy />}>
                      <span className="font-mono text-xs text-ink-3">{t.reference}</span>
                      <span className="truncate">{t.subject}</span>
                    </Item>
                  ))}
                </Command.Group>
              ) : null}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Item({ value, onSelect, icon, children }: { value: string; onSelect: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="group flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink-2 data-[selected=true]:bg-primary-light/70 data-[selected=true]:text-ink [&>svg]:h-4 [&>svg]:w-4"
    >
      <span className="text-ink-3 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      <ArrowRight className="h-3.5 w-3.5 text-ink-3 opacity-0 group-data-[selected=true]:opacity-100" aria-hidden="true" />
    </Command.Item>
  );
}
