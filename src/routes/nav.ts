import {
  AlarmClock,
  KeyRound,
  UserCheck,
  BadgeCheck,
  BookOpen,
  ClipboardCheck,
  FileText,
  FolderKanban,
  Gauge,
  HandCoins,
  Inbox,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  ReceiptText,
  Scale,
  ShieldAlert,
  UserPlus,
  Users,
  UsersRound,
  Search,
  type LucideIcon,
} from "lucide-react";
import type { Segment } from "@/types/domain";

/**
 * Navigation derives from the signed-in segment (FR-SV-001: one app, role-scoped
 * shell). Hiding nav is never the security boundary; the backend checks every call.
 */

export type BadgeKey =
  | "quotes"
  | "assignment"
  | "disbursement"
  | "refunds"
  | "verification"
  | "active"
  | "sourcing"
  | "qc"
  | "moderation"
  | "onboarding"
  | "tickets"
  | "stalled"
  | "applications";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: BadgeKey;
  group?: string;
}

export const NAV: Record<Segment, NavItem[]> = {
  qqd: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/stalled", label: "Stalled", icon: AlarmClock, badge: "stalled", group: "Work" },
    { to: "/quotes", label: "Quotes", icon: FileText, badge: "quotes", group: "Work" },
    { to: "/assignment", label: "To assign", icon: UserPlus, badge: "assignment", group: "Work" },
    { to: "/moderation", label: "Messages on hold", icon: ShieldAlert, badge: "moderation", group: "Work" },
    { to: "/projects", label: "All projects", icon: Search, group: "Work" },
    { to: "/disbursement", label: "Payouts", icon: HandCoins, badge: "disbursement", group: "Money" },
    { to: "/refunds", label: "Refunds", icon: ReceiptText, badge: "refunds", group: "Money" },
    { to: "/ledger", label: "Transactions", icon: Landmark, group: "Money" },
    { to: "/rates", label: "Price guide", icon: Scale, group: "Money" },
    { to: "/verification", label: "Doer checks", icon: BadgeCheck, badge: "verification", group: "People" },
    { to: "/supervisor-checks", label: "Supervisor checks", icon: UserCheck, badge: "applications", group: "People" },
    { to: "/people", label: "People", icon: UsersRound, group: "People" },
    { to: "/logins", label: "Workspace logins", icon: KeyRound, group: "People" },
    { to: "/training", label: "Training", icon: BookOpen, group: "People" },
  ],
  supervisor: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/active", label: "My projects", icon: FolderKanban, badge: "active", group: "Work" },
    { to: "/sourcing", label: "Find a doer", icon: Users, badge: "sourcing", group: "Work" },
    { to: "/qc", label: "Quality check", icon: ClipboardCheck, badge: "qc", group: "Work" },
    { to: "/moderation", label: "Messages on hold", icon: ShieldAlert, badge: "moderation", group: "Work" },
    { to: "/doers", label: "Doers", icon: UsersRound, group: "Doers" },
    { to: "/onboarding", label: "New doers", icon: BadgeCheck, badge: "onboarding", group: "Doers" },
    { to: "/performance", label: "My stats", icon: Gauge, group: "Doers" },
  ],
  support: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/tickets", label: "Tickets", icon: LifeBuoy, badge: "tickets", group: "Work" },
    { to: "/moderation", label: "Messages on hold", icon: ShieldAlert, badge: "moderation", group: "Work" },
    { to: "/projects", label: "All projects", icon: Inbox, group: "Work" },
  ],
};
