"use client";
// ResQX view registry — ViewId → component (client-side routing, single route app)
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ViewId } from "@/lib/nav";

const loading = () => <div className="flex h-[50vh] items-center justify-center text-xs text-muted-foreground">Loading module…</div>;

import HomeView from "./home-view";

export const VIEW_COMPONENTS: Record<ViewId, ComponentType> = {
  home: HomeView,
  dashboard: dynamic(() => import("./dashboard-view"), { ssr: false, loading }),
  map: dynamic(() => import("./map-view"), { ssr: false, loading }),
  analytics: dynamic(() => import("./analytics-view"), { ssr: false, loading }),
  vulnerability: dynamic(() => import("./vulnerability-view"), { ssr: false, loading }),
  capacity: dynamic(() => import("./capacity-view"), { ssr: false, loading }),
  relocation: dynamic(() => import("./relocation-view"), { ssr: false, loading }),
  simulation: dynamic(() => import("./simulation-view"), { ssr: false, loading }),
  satellite: dynamic(() => import("./satellite-view"), { ssr: false, loading }),
  alerts: dynamic(() => import("./alerts-view"), { ssr: false, loading }),
  infrastructure: dynamic(() => import("./infrastructure-view"), { ssr: false, loading }),
  "field-reports": dynamic(() => import("./field-reports-view"), { ssr: false, loading }),
  schemes: dynamic(() => import("./schemes-view"), { ssr: false, loading }),
  protection: dynamic(() => import("./protection-view"), { ssr: false, loading }),
  "gov-reports": dynamic(() => import("./gov-reports-view"), { ssr: false, loading }),
  admin: dynamic(() => import("./admin-view"), { ssr: false, loading }),
};
