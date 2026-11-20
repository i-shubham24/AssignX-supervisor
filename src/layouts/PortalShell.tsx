import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import * as Popover from "@radix-ui/react-popover";
import * as Switch from "@radix-ui/react-switch";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { Bell, LogOut, Menu, Settings, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV } from "@/routes/nav";
import { SEGMENTS } from "@/lib/config";
import { useMe, useSession } from "@/providers/SessionProvider";
import { useUiStore } from "@/stores/useUiStore";
import { useBadges } from "@/features/shell/useBadges";
import { useAction, useNotifications } from "@/api/hooks";
import * as api from "@/api/portal";
import { formatRelative } from "@/lib/datetime";
import { Avatar } from "@/components/portal/kit";
import { Kbd } from "@/components/portal/pills";
import { Tip } from "@/components/ui/overlay";
import { CommandPalette } from "@/features/shell/CommandPalette";
import { ShortcutsDialog } from "@/features/shell/ShortcutsDialog";
import { env } from "@/lib/env";
import { internalPath } from "@/lib/safe-url";

/**
 * The signed-in frame: a light sidebar card on the canvas (desktop), a slim top bar
 * with a slide-in menu (tablet and phone), and the page in a centred column.
 */
export function PortalShell() {
  const location = useLocation();
  const dark = useUiStore((s) => s.dark);
  const [drawer, setDrawer] = useState(false);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    document.getElementById("main")?.scrollTo({ top: 0 });
    setDrawer(false);
  }, [location.pathname]);

  return (
    <div className={cn("flex h-dvh overflow-hidden bg-canvas", env.demoInProduction && "pt-8")}>
      <aside className="hidden lg:flex" aria-label="Main menu">
        <Sidebar />
      </aside>

      <Dialog.Root open={drawer} onOpenChange={setDrawer}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[284px] max-w-[85vw] outline-none data-[state=open]:animate-[slide-in_260ms_var(--ease-spring)] lg:hidden" aria-label="Main menu">
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <Dialog.Description className="sr-only">Portal navigation</Dialog.Description>
            <Sidebar inDrawer onClose={() => setDrawer(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-y-auto" id="main">
          <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-3 sm:px-6 lg:px-7">
            <TopBar onMenu={() => setDrawer(true)} />
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
      <CommandPalette />
      <ShortcutsDialog />
    </div>
  );
}

function PageFallback() {
  return (
    <div className="space-y-4 pt-2" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-9 w-72 max-w-full" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-80 rounded-2xl" />
    </div>
  );
}

/* Sidebar ------------------------------------------------------------ */

function Sidebar({ inDrawer = false, onClose }: { inDrawer?: boolean; onClose?: () => void }) {
  const me = useMe();
  const { signOut } = useSession();
  const storeCollapsed = useUiStore((s) => s.railCollapsed);
  const collapsed = inDrawer ? false : storeCollapsed;
  const toggle = useUiStore((s) => s.toggleRail);
  const dark = useUiStore((s) => s.dark);
  const toggleDark = useUiStore((s) => s.toggleDark);
  const badges = useBadges();
  const items = NAV[me.segment];
  const groups: (string | undefined)[] = [];
  for (const item of items) if (!groups.includes(item.group)) groups.push(item.group);

  useEffect(() => {
    if (inDrawer) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, inDrawer]);

  return (
    <motion.div
      className={cn("flex h-full shrink-0 flex-col p-3 select-none", inDrawer ? "w-full bg-canvas" : "")}
      animate={inDrawer ? undefined : { width: collapsed ? 84 : 256 }}
      transition={{ type: "spring", stiffness: 420, damping: 40 }}
    >
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line-card bg-surface shadow-soft-sm">
        {/* Brand and collapse */}
        <div className={cn("flex items-center gap-2 border-b border-line-subtle px-4 py-3.5", collapsed && "flex-col px-2")}>
          {!collapsed ? (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">
                AssignX<span className="text-primary">.</span>
              </div>
              <div className="text-[11.5px] text-ink-3">Supervisor portal</div>
            </div>
          ) : (
            <div className="text-[15px] font-extrabold text-ink" aria-label="AssignX">
              A<span className="text-primary">.</span>
            </div>
          )}
          {inDrawer ? (
            <button onClick={onClose} className="rounded-lg p-1.5 text-ink-3 hover:bg-hover hover:text-ink" aria-label="Close menu">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <Tip content={collapsed ? "Expand (Ctrl B)" : "Collapse (Ctrl B)"} side="right">
              <button onClick={toggle} className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-hover hover:text-ink" aria-label={collapsed ? "Expand menu" : "Collapse menu"}>
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            </Tip>
          )}
        </div>

        {!collapsed ? (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 ring-1 ring-line-card">
            <span className="h-2 w-2 rounded-full bg-segment" aria-hidden="true" />
            <span className="text-[12.5px] font-bold text-ink-2">{SEGMENTS[me.segment].label}</span>
            {me.is_lead ? <span className="ml-auto rounded-full bg-subtle px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-muted">Lead</span> : null}
          </div>
        ) : null}

        <nav className={cn("min-h-0 flex-1 overflow-y-auto px-3 pb-3", collapsed && "px-2")}>
          {groups.map((group) => (
            <div key={group ?? "root"} className="mt-3">
              {group && !collapsed ? <div className="px-2.5 pb-1.5 text-[11px] font-semibold text-ink-3">{group}</div> : null}
              {group && collapsed ? <div className="mx-auto mb-2 h-px w-8 bg-line-card" /> : null}
              <ul className="flex flex-col gap-0.5">
                {items
                  .filter((i) => i.group === group)
                  .map((item) => {
                    const badge = item.badge ? badges[item.badge] : undefined;
                    const link = (
                      <NavLink
                        to={item.to}
                        end={item.to === "/"}
                        className={({ isActive }) =>
                          cn(
                            "group relative flex items-center rounded-xl transition-colors duration-150",
                            collapsed ? "mx-auto h-10 w-10 justify-center" : "h-10 gap-2.5 px-2.5 text-[13.5px]",
                            isActive ? "bg-gradient-to-b from-primary-from to-primary-to font-semibold text-white shadow-[0_4px_12px_rgba(238,107,80,0.3)]" : "font-medium text-ink-muted hover:bg-hover hover:text-ink",
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                            {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
                            {badge && badge.count > 0 ? (
                              <span
                                className={cn(
                                  "tabular flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                                  isActive ? "bg-white/25 text-white" : badge.urgent ? "bg-danger-dot text-white" : "bg-subtle text-ink-2",
                                  collapsed && "absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[9.5px] ring-2 ring-surface",
                                )}
                                aria-label={`${badge.count}${badge.urgent ? ", some late" : ""}`}
                              >
                                {badge.count}
                              </span>
                            ) : null}
                          </>
                        )}
                      </NavLink>
                    );
                    return <li key={item.to}>{collapsed ? <Tip content={item.label} side="right">{link}</Tip> : link}</li>;
                  })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={cn("space-y-1 border-t border-line-subtle p-3", collapsed && "flex flex-col items-center px-2")}>
          <button
            onClick={toggleDark}
            aria-label={dark ? "Use light mode" : "Use dark mode"}
            className={cn("flex items-center rounded-xl text-ink-muted transition-colors hover:bg-hover hover:text-ink", collapsed ? "h-10 w-10 justify-center" : "h-10 w-full gap-2.5 px-2.5 text-[13.5px] font-medium")}
          >
            {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            {!collapsed ? <span>{dark ? "Light mode" : "Dark mode"}</span> : null}
          </button>
          <div className={cn("flex items-center gap-2.5 rounded-xl p-1.5", collapsed && "flex-col")}>
            <Avatar name={me.full_name} className="h-9 w-9 bg-primary-light text-primary-ink" />
            {!collapsed ? (
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[13px] font-bold text-ink">{me.full_name}</div>
                <div className="truncate text-[11.5px] text-ink-3">{me.email}</div>
              </div>
            ) : null}
            <Tip content="Settings" side={collapsed ? "right" : "top"}>
              <NavLink to="/settings" className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-hover hover:text-ink" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </NavLink>
            </Tip>
            <Tip content="Sign out" side={collapsed ? "right" : "top"}>
              <button onClick={signOut} className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-hover hover:text-ink" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </Tip>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* Top bar ------------------------------------------------------------ */

function TopBar({ onMenu }: { onMenu: () => void }) {
  const me = useMe();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const duty = useAction((on: boolean) => api.setOnDuty(me.id, on), { success: (_r, on) => (on ? "You're on duty" : "You're off duty") });

  return (
    <div className="mb-4 flex h-12 items-center gap-2 sm:gap-3">
      <button onClick={onMenu} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-card bg-surface text-ink-2 shadow-soft-sm lg:hidden" aria-label="Open menu">
        <Menu className="h-4 w-4" />
      </button>
      <button
        onClick={() => setCommandOpen(true)}
        className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-line-card bg-surface px-4 text-left text-[13px] text-ink-3 shadow-soft-sm transition-colors hover:border-line hover:text-ink-muted sm:max-w-[420px]"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Search</span>
        <span className="ml-auto hidden sm:inline-flex">
          <Kbd>Ctrl K</Kbd>
        </span>
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {env.demoMode ? <span className="hidden rounded-full border border-dashed border-violet-dot/50 bg-violet-bg px-2.5 py-1 text-[11px] font-bold text-violet-ink md:inline">Demo data</span> : null}
        <label className="flex h-10 items-center gap-2 rounded-full border border-line-card bg-surface px-2 text-[13px] font-semibold text-ink-2 shadow-soft-sm sm:pl-3">
          <span className="hidden sm:inline">On duty</span>
          <Switch.Root defaultChecked={me.on_duty} onCheckedChange={(v) => duty.mutate(v)} className="relative h-5 w-9 rounded-full bg-muted transition-colors data-[state=checked]:bg-success-dot" aria-label="On duty">
            <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow-soft-sm transition-transform data-[state=checked]:translate-x-[18px]" />
          </Switch.Root>
        </label>
        <NotificationsButton />
      </div>
    </div>
  );
}

function NotificationsButton() {
  const me = useMe();
  const navigate = useNavigate();
  const { data = [] } = useNotifications(me.segment);
  const unread = data.filter((n) => !n.read_at).length;
  const markRead = useAction((id: string) => api.markNotificationRead(me.segment, id));
  const markAll = useAction(() => api.markNotificationRead(me.segment, "all"));
  const toneDot = { info: "bg-info-dot", warning: "bg-warning-dot", danger: "bg-danger-dot", success: "bg-success-dot" } as const;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line-card bg-surface text-ink-2 shadow-soft-sm transition-colors hover:bg-hover" aria-label={`Notifications, ${unread} unread`}>
          <Bell className="h-4 w-4" />
          {unread ? <span className="tabular absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-canvas">{unread}</span> : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} collisionPadding={12} className="z-50 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-line-card bg-surface shadow-soft-lg">
          <div className="flex items-center justify-between border-b border-line-subtle px-4 py-3">
            <span className="text-sm font-bold">Notifications</span>
            {unread ? (
              <button onClick={() => markAll.mutate()} className="text-xs font-semibold text-primary-ink hover:underline">
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-[420px] divide-y divide-line-subtle overflow-y-auto">
            {data.length === 0 ? <li className="px-4 py-8 text-center text-sm text-ink-3">You're all caught up.</li> : null}
            {data.map((n) => (
              <li key={n.id}>
                <Popover.Close asChild>
                  <button
                    onClick={() => {
                      if (!n.read_at) markRead.mutate(n.id);
                      // Deep links come from data: only ever follow in-app paths.
                      const to = internalPath(n.href);
                      if (to) navigate(to);
                    }}
                    className={cn("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-hover", !n.read_at && "bg-primary-light/40")}
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : toneDot[n.tone])} aria-hidden="true" />
                    {!n.read_at ? <span className="sr-only">Unread.</span> : null}
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold text-ink">{n.title}</span>
                      <span className="block text-[12.5px] leading-snug text-ink-muted">{n.body}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-3">{formatRelative(n.created_at)}</span>
                    </span>
                  </button>
                </Popover.Close>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}