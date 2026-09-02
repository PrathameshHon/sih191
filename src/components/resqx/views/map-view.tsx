"use client";
// ResQX Risk Map — full multi-hazard GIS view (real Maharashtra geography)
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Map as MapIcon, Layers, Building2, BellRing, Radio, AlertTriangle, Waves, Mountain,
  Zap, Sun, Wind, Crosshair, ShieldCheck, School, Camera, Users, LocateFixed,
} from "lucide-react";
import { useResQX } from "../store";
import {
  SectionHeader, StatCard, RiskBadge, MapLegend, SkeletonBlock, ScoreBar, fmtIN, fmtCompact, LiveDot,
} from "../widgets";
import type { Habitation } from "@/lib/types";
import { RISK_COLORS } from "@/lib/types";
import type { MapMetric } from "../hazard-map";
import { areaFor } from "@/lib/static-data";
import { cn } from "@/lib/utils";

const HazardMap = dynamic(() => import("../hazard-map"), {
  ssr: false,
  loading: () => <div className="flex h-[520px] items-center justify-center rounded-xl border border-emerald-900/40 text-xs text-muted-foreground">Loading Maharashtra map…</div>,
});

const METRICS: { key: MapMetric; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: "composite", label: "Composite", icon: Layers, color: "#10b981" },
  { key: "flood", label: "Flood", icon: Waves, color: "#38bdf8" },
  { key: "landslide", label: "Landslide", icon: Mountain, color: "#a3e635" },
  { key: "earthquake", label: "Earthquake", icon: Zap, color: "#fb923c" },
  { key: "cyclone", label: "Cyclone", icon: Wind, color: "#c084fc" },
  { key: "drought", label: "Drought", icon: Sun, color: "#fbbf24" },
];

const QUICK_JUMPS: { label: string; lat: number; lng: number; zoom: number }[] = [
  { label: "Mumbai–Thane", lat: 19.12, lng: 72.9, zoom: 10 },
  { label: "Shirdi–Kopargaon", lat: 19.83, lng: 74.48, zoom: 10 },
  { label: "Pune", lat: 18.53, lng: 73.85, zoom: 10 },
  { label: "Nashik", lat: 19.99, lng: 73.75, zoom: 10 },
  { label: "Kolhapur–Sangli", lat: 16.77, lng: 74.44, zoom: 10 },
  { label: "Raigad Ghats", lat: 18.2, lng: 73.3, zoom: 9 },
  { label: "Marathwada", lat: 18.6, lng: 76.2, zoom: 8 },
];

export default function MapView() {
  const {
    data, loading, setView,
    selectedHabitationId, setSelectedHabitationId,
    selectedSiteId, setSelectedSiteId,
    focusTarget, focusOn,
    matchFor, siteOf, siteById, simActive,
  } = useResQX();

  const [metric, setMetric] = useState<MapMetric>("composite");
  const [showSites, setShowSites] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showShelters, setShowShelters] = useState(false);
  const [showInfra, setShowInfra] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showBlobs, setShowBlobs] = useState(true);

  // handle focus event from topbar search
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!id) return;
      setSelectedHabitationId(id);
      const h = data?.habitations.find((x) => x.id === id);
      if (h) focusOn(h.lat, h.lng, 10);
    };
    window.addEventListener("resqx:focus-habitation", handler);
    return () => window.removeEventListener("resqx:focus-habitation", handler);
  }, [data, setSelectedHabitationId, focusOn]);

  const zoneAreaEstimate = useMemo(() => {
    if (!data) return null;
    // estimate exposure area: distribute each district's area across its habitations by risk share
    const byDistrict = new Map<string, Habitation[]>();
    for (const h of data.habitations) {
      const arr = byDistrict.get(h.district) ?? [];
      arr.push(h);
      byDistrict.set(h.district, arr);
    }
    const totals = { high: 0, medium: 0, low: 0, safe: 0 };
    for (const [district, members] of byDistrict) {
      const area = areaFor(district)?.areaKm2 ?? 0;
      for (const m of members) {
        totals[m.riskLevel] += area / members.length;
      }
    }
    return totals;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Multi-Hazard Risk Map" subtitle="Loading live Maharashtra risk layers…" icon={MapIcon} />
        <SkeletonBlock className="h-[520px]" />
      </div>
    );
  }
  if (!data) return null;

  const selected = selectedHabitationId ? data.habitations.find((h) => h.id === selectedHabitationId) : null;
  const selectedMatch = selected ? matchFor(selected.id) : null;
  const selectedSite = selected ? siteOf(selected.id) : null;
  const routeLine =
    selected && selectedSite ? ([[selected.lat, selected.lng], [selectedSite.lat, selectedSite.lng]] as [number, number][]) : undefined;

  const zoneStats = data.analytics.zoneStats;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Multi-Hazard Risk Map"
        subtitle="94 surveyed habitations · 27 districts · live hazard composite from flood, landslide, earthquake, cyclone & drought layers"
        icon={MapIcon}
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
            <LiveDot /> {simActive ? "SIMULATION MODE" : "LIVE BASELINE"}
          </div>
        }
      />

      {/* metric selector + quick jumps */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-emerald-500/20 bg-[#0a1210] p-1.5">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors",
                metric === m.key ? "text-white" : "text-muted-foreground hover:text-foreground"
              )}
              style={metric === m.key ? { background: m.color === "#10b981" ? "rgba(16,185,129,.25)" : `${m.color}33`, boxShadow: `inset 0 0 0 1px ${m.color}66`, color: m.color } : undefined}
            >
              <m.icon className="h-3.5 w-3.5" /> {m.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Crosshair className="h-3.5 w-3.5 text-emerald-600" />
          {QUICK_JUMPS.map((j) => (
            <button
              key={j.label}
              onClick={() => focusOn(j.lat, j.lng, j.zoom)}
              className="rounded-full border border-emerald-500/25 bg-emerald-500/5 px-3 py-1.5 text-[11px] text-emerald-200/90 transition-colors hover:bg-emerald-500/15"
            >
              {j.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* controls + legend */}
        <div className="space-y-3">
          <div className="panel p-4">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3.5 w-3.5 text-emerald-400" /> Hazard Layers
            </p>
            <div className="space-y-2.5">
              {[
                { key: "blobs", label: "District risk fields", icon: Layers, value: showBlobs, set: setShowBlobs },
                { key: "sites", label: "Safe relocation sites", icon: ShieldCheck, value: showSites, set: setShowSites },
                { key: "alerts", label: "Live alerts", icon: BellRing, value: showAlerts, set: setShowAlerts },
                { key: "shelters", label: "Relief shelters", icon: School, value: showShelters, set: setShowShelters },
                { key: "infra", label: "Infrastructure", icon: Building2, value: showInfra, set: setShowInfra },
                { key: "reports", label: "Field reports", icon: Camera, value: showReports, set: setShowReports },
              ].map((l) => (
                <button
                  key={l.key}
                  onClick={() => l.set(!l.value)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs text-foreground/85 hover:bg-emerald-500/8"
                >
                  <span className="flex items-center gap-2">
                    <l.icon className="h-3.5 w-3.5 text-emerald-500" /> {l.label}
                  </span>
                  <span className={cn("relative h-4.5 w-8 rounded-full transition-colors", l.value ? "bg-emerald-500" : "bg-emerald-950")}>
                    <span className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all", l.value ? "left-4" : "left-0.5")} />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <MapLegend metric={metric} />

          {/* zone area estimates */}
          {zoneAreaEstimate && (
            <div className="panel space-y-2 p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Exposure Area (est.)</p>
              {(["high", "medium", "low", "safe"] as const).map((lv) => (
                <div key={lv} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-2 text-foreground/85">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: RISK_COLORS[lv] }} />
                    {lv === "high" ? "High Risk Zones" : lv === "medium" ? "Medium Risk Zones" : lv === "low" ? "Low Risk Zones" : "Safe Zones"}
                  </span>
                  <span className="font-semibold tabular-nums">{fmtIN(Math.round(zoneAreaEstimate[lv]))} km²</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* map */}
        <div className="lg:col-span-3">
          <div className="relative">
            <HazardMap
              habitations={data.habitations}
              sites={data.sites}
              alerts={data.alerts.filter((a) => a.active)}
              shelters={data.shelters}
              infrastructure={data.infrastructure}
              reports={data.fieldReports}
              metric={metric}
              showSites={showSites}
              showAlerts={showAlerts}
              showShelters={showShelters}
              showInfra={showInfra}
              showReports={showReports}
              showDistrictBlobs={showBlobs}
              height={560}
              selectedHabitationId={selectedHabitationId}
              selectedSiteId={selectedSiteId}
              routeLine={routeLine}
              focusTarget={focusTarget}
              onSelectHabitation={(h) => setSelectedHabitationId(h.id)}
              onSelectSite={(s) => setSelectedSiteId(s.id)}
            />
            {/* hover hint */}
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-emerald-500/25 bg-[#0a1210]/90 px-3.5 py-1.5 text-[10px] text-muted-foreground backdrop-blur">
              Click a settlement for its risk profile · green squares = verified safe sites
            </div>
          </div>

          {/* zone stat strip */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {zoneStats.map((z) => (
              <div key={z.level} className="panel flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                    {z.level === "high" ? "High Risk" : z.level === "medium" ? "Medium" : z.level === "low" ? "Low Risk" : "Safe"}
                  </p>
                  <p className="font-display text-lg font-bold tabular-nums" style={{ color: RISK_COLORS[z.level] }}>
                    {z.habitations}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-muted-foreground">population</p>
                  <p className="text-xs font-semibold tabular-nums text-foreground/90">{fmtCompact(z.population)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* selected habitation detail */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <LocateFixed className="h-4 w-4 text-emerald-400" />
                <h3 className="font-display text-lg font-bold">{selected.name}</h3>
                <RiskBadge level={selected.riskLevel} />
                {selected.priorityRank <= 10 && (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                    RELOCATION PRIORITY #{selected.priorityRank}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {selected.taluka} Taluka · {selected.district} District · {fmtIN(selected.population)} people · {fmtIN(selected.households)} households
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setView("relocation")} className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20">
                Relocation Plan
              </button>
              <button onClick={() => setSelectedHabitationId(null)} className="rounded-lg border border-emerald-900/50 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
                Close
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Hazard Score — {selected.hazardScore.toFixed(1)}/100</p>
              {(Object.entries(selected.scores) as [keyof typeof selected.scores, number][]).map(([k, v]) => {
                const meta = { flood: { c: "#38bdf8", l: "Flood" }, landslide: { c: "#a3e635", l: "Landslide" }, earthquake: { c: "#fb923c", l: "Earthquake" }, cyclone: { c: "#c084fc", l: "Cyclone" }, drought: { c: "#fbbf24", l: "Drought" } }[k]!;
                return <ScoreBar key={k} value={v} label={meta.l} right={v.toFixed(0)} color={meta.c} />;
              })}
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {[
                ["Vulnerability", selected.vulnerability.toFixed(2)],
                ["Urgency", selected.urgency.toFixed(2)],
                ["Pop at risk", fmtIN(selected.populationAtRisk)],
                ["Kutcha housing", `${selected.kutchaPct}%`],
                ["Water source", selected.waterSource],
                ["Infra access", `${Math.round(selected.infraAccess * 100)}%`],
                ["Elevation", `${fmtIN(selected.elevationM)} m`],
                ["Slope", `${selected.slopeDeg}°`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-2.5">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{k}</p>
                  <p className="mt-0.5 font-semibold text-foreground/95">{v}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 text-amber-500" /> Disaster History
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.events.map((e) => (
                    <span key={e} className="rounded-full border border-amber-500/30 bg-amber-500/8 px-2.5 py-1 text-[10px] text-amber-200/90">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  <Users className="h-3 w-3" /> Relocation Match
                </p>
                {selectedMatch && (selectedMatch.status === "matched" || selectedMatch.status === "partial") ? (
                  <>
                    <p className="mt-1.5 text-xs text-foreground/90">
                      {selectedMatch.status === "matched" ? "Full match" : "Phased (partial) match"} →{" "}
                      <span className="font-semibold text-emerald-300">{selectedSite?.name}</span>
                      {selectedMatch.distanceKm != null && <span className="text-muted-foreground"> · {selectedMatch.distanceKm} km</span>}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Phase-1: {fmtIN(selectedMatch.assignedPop)} persons of {fmtIN(selected.population)}
                      {selectedSite && ` · site capacity ${fmtIN(selectedSite.capacity)}`}
                    </p>
                  </>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {selectedMatch?.status === "in_situ"
                      ? "Metropolitan ward — in-situ mitigation (drainage, flood-proofing) rather than relocation."
                      : "No safe-site capacity within range — Phase-2 land acquisition recommended."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
