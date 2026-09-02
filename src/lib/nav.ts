import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Map as MapIcon, PieChart, Users, Landmark, Truck, BellRing,
  Building2, Landmark as Bank, ShieldCheck, Satellite, FlaskConical, Camera,
  FileText, ShieldEllipsis, Home,
} from "lucide-react";

export type ViewId =
  | "home" | "dashboard" | "map" | "analytics"
  | "vulnerability" | "capacity" | "relocation" | "simulation" | "satellite"
  | "alerts" | "infrastructure" | "field-reports"
  | "schemes" | "protection" | "gov-reports" | "admin";

export interface NavItem {
  id: ViewId;
  labelKey: string;
  icon: LucideIcon;
  badge?: "alerts";
}

export interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "nav.group.overview",
    items: [
      { id: "home", labelKey: "nav.home", icon: Home },
      { id: "dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { id: "map", labelKey: "nav.map", icon: MapIcon },
      { id: "analytics", labelKey: "nav.analytics", icon: PieChart },
    ],
  },
  {
    labelKey: "nav.group.risk",
    items: [
      { id: "vulnerability", labelKey: "nav.vulnerability", icon: Users },
      { id: "capacity", labelKey: "nav.capacity", icon: Landmark },
      { id: "relocation", labelKey: "nav.relocation", icon: Truck },
      { id: "simulation", labelKey: "nav.simulation", icon: FlaskConical },
      { id: "satellite", labelKey: "nav.satellite", icon: Satellite },
    ],
  },
  {
    labelKey: "nav.group.operations",
    items: [
      { id: "alerts", labelKey: "nav.alerts", icon: BellRing, badge: "alerts" },
      { id: "infrastructure", labelKey: "nav.infrastructure", icon: Building2 },
      { id: "field-reports", labelKey: "nav.reports", icon: Camera },
    ],
  },
  {
    labelKey: "nav.group.programs",
    items: [
      { id: "schemes", labelKey: "nav.schemes", icon: Bank },
      { id: "protection", labelKey: "nav.protection", icon: ShieldCheck },
      { id: "gov-reports", labelKey: "nav.govreports", icon: FileText },
      { id: "admin", labelKey: "nav.admin", icon: ShieldEllipsis },
    ],
  },
];
