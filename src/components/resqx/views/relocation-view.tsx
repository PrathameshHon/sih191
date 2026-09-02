"use client";
// ResQX — Relocation Planning (view: relocation). Part 3 of the core flow:
// Vulnerability → Capacity → Relocation. The money view: urgency-ranked
// habitations matched to carrying-capacity-verified safe sites.
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  AlertTriangle, ArrowRight, CheckCircle2, FileText, Map, Truck, UserCheck, Users,
} from "lucide-react";
import { useResQX } from "../store";
import {
  MatchStatusPill, RiskBadge, ScoreBar, SectionHeader, SkeletonBlock, StatCard,
  fmtCompact, fmtIN,
} from "../widgets";
import { HAZARD_META } from "@/lib/static-data";
import type { Habitation } from "@/lib/types";

const HazardMap = dynamic(() => import("../hazard-map"), { ssr: false });

// ---------- local helpers ----------

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function PanelHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-2">
      <div>
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

// ---------- view ----------

export default function RelocationView() {
  const {
    data, loading, setView, focusOn, focusTarget,
    setSelectedHabitationId, selectedHabitationId,
  } = useResQX();

  const habitations = useMemo(() => data?.habitations ?? [], [data]);
  const matches = useMemo(() => data?.matches ?? [], [data]);

  const kpis = useMemo(() => {
    const matchedOrPhased = matches.filter((m) => m.status === "matched" || m.status === "partial").length;
    const personsPlanned = matches.reduce((a, m) => a + m.assignedPop, 0);
    const gaps = matches.filter((m) => m.status === "no_site").length;
    return { matchedOrPhased, personsPlanned, gaps };
  }, [matches]);

  const selected = useMemo<Habitation | null>(() => {
    if (selectedHabitationId) {
      const found = habitations.find((h) => h.id === selectedHabitationId);
      if (found) return found;
    }
    return habitations[0] ?? null;
  }, [habitations, selectedHabitationId]);

  const routeLine = useMemo<[number, number][] | undefined>(() => {
    if (!data || !selected) return undefined;
    const m = data.matchById[selected.id];
    const site = m?.siteId ? data.sites.find((s) => s.id === m.siteId) : undefined;
    if (!site) return undefined;
    return [
      [selected.lat, selected.lng],
      [site.lat, site.lng],
    ];
  }, [data, selected]);

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <SkeletonBlock className="h-14" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <SkeletonBlock className="h-96 lg:col-span-2" />
          <SkeletonBlock className="h-96" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { matchById, sites } = data;
  const selectedMatch = selected ? matchById[selected.id] : undefined;
  const selectedSite = selectedMatch?.siteId ? sites.find((s) => s.id === selectedMatch.siteId) : undefined;

  const siteLineOf = (h: Habitation): string => {
    const m = matchById[h.id];
    if (!m) return "—";
    if (m.status === "in_situ") return "in-situ mitigation";
    if (m.status === "no_site") return "no site — Phase-2";
    const site = m.siteId ? sites.find((s) => s.id === m.siteId) : undefined;
    return site ? `→ ${site.name} · ${m.distanceKm ?? 0} km` : "—";
  };

  const kpiCards = [
    {
      label: "Priority Habitations",
      value: fmtIN(habitations.length),
      sub: "ranked by composite urgency",
      icon: Users,
      tone: "default" as const,
    },
    {
      label: "Matched or Phased",
      value: fmtIN(kpis.matchedOrPhased),
      sub: "site capacity secured",
      icon: CheckCircle2,
      tone: "success" as const,
    },
    {
      label: "Persons Planned",
      value: fmtCompact(kpis.personsPlanned),
      sub: "Phase-1 relocation",
      icon: UserCheck,
      tone: "info" as const,
    },
    {
      label: "Capacity Gap",
      value: fmtIN(kpis.gaps),
      sub: "habitations need Phase-2 sites",
      icon: AlertTriangle,
      tone: "danger" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Relocation Planning"
        subtitle="Urgency-ranked habitations matched to carrying-capacity-verified safe sites"
        icon={Truck}
        actions={
          <button
            onClick={() => setView("capacity")}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
          >
            View Capacity <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((k, i) => (
          <StatCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} tone={k.tone} delay={0.03 * i} />
        ))}
      </div>

      {/* main grid: priority list + selected detail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal delay={0.15} className="lg:col-span-2">
          <div className="panel p-4 sm:p-5">
            <PanelHead
              title="Relocation Priority List"
              sub="Greedy assignment — most urgent habitations claim scarce site capacity first"
              right={
                <span className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                  {fmtIN(habitations.length)} rows
                </span>
              }
            />
            <div className="thin-scrollbar max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {habitations.map((h) => {
                const match = matchById[h.id];
                const isSelected = h.id === selectedHabitationId;
                return (
                  <button
                    key={h.id}
                    onClick={() => {
                      setSelectedHabitationId(h.id);
                      focusOn(h.lat, h.lng, 10);
                    }}
                    className={`panel panel-hover w-full rounded-xl p-3 text-left transition-colors ${
                      isSelected ? "border-emerald-500/40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-display text-xs font-bold tabular-nums ${
                          h.priorityRank <= 3
                            ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                            : "border-emerald-900/50 bg-emerald-950/40 text-emerald-500/80"
                        }`}
                      >
                        #{h.priorityRank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[13px] font-semibold text-foreground">
                            {h.name}
                            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">· {h.taluka}</span>
                          </p>
                          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                            Pop {fmtCompact(h.population)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{h.district} district</p>
                        <div className="mt-2 flex items-center gap-2">
                          <ScoreBar
                            label="Urgency"
                            value={h.urgency * 100}
                            right={h.urgency.toFixed(2)}
                            className="min-w-0 flex-1"
                          />
                          <RiskBadge level={h.riskLevel} className="shrink-0" />
                        </div>
                      </div>
                      <div className="flex w-32 shrink-0 flex-col items-end justify-start gap-1.5 sm:w-44">
                        {match && <MatchStatusPill status={match.status} />}
                        <span className="max-w-full truncate text-right text-[10px] leading-tight text-muted-foreground tabular-nums">
                          {siteLineOf(h)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* selected habitation detail — sticky */}
        <Reveal delay={0.18} className="self-start lg:sticky lg:top-20">
          <div className="panel flex flex-col gap-3 p-4 sm:p-5">
            {selected ? (
              <>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-semibold text-foreground">{selected.name}</h3>
                    <RiskBadge level={selected.riskLevel} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Priority #{selected.priorityRank} · {selected.taluka}, {selected.district} district
                  </p>
                </div>

                {/* per-hazard exposure */}
                <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3">
                  <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Per-hazard exposure
                  </p>
                  <div className="space-y-2.5">
                    {HAZARD_META.map((meta) => (
                      <ScoreBar
                        key={meta.key}
                        label={meta.label}
                        value={selected.scores[meta.key]}
                        color={meta.color}
                      />
                    ))}
                  </div>
                </div>

                {/* key numbers */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-2.5">
                    <p className="font-display text-lg font-bold text-orange-400 tabular-nums">
                      {selected.vulnerability.toFixed(2)}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Vulnerability</p>
                  </div>
                  <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-2.5">
                    <p className="font-display text-lg font-bold text-red-400 tabular-nums">
                      {selected.urgency.toFixed(2)}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Urgency</p>
                  </div>
                  <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-2.5">
                    <p className="font-display text-lg font-bold tabular-nums">{fmtIN(selected.population)}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Population</p>
                  </div>
                  <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-2.5">
                    <p className="font-display text-lg font-bold text-red-400 tabular-nums">
                      {fmtIN(selected.populationAtRisk)}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">At risk</p>
                  </div>
                </div>

                {/* disaster history */}
                {selected.events.length > 0 && (
                  <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <AlertTriangle className="h-3 w-3 text-amber-400" /> Disaster history
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.events.map((ev) => (
                        <span
                          key={ev}
                          className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[10px] text-amber-200/90"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* match card */}
                {selectedMatch && selectedMatch.status !== "in_situ" && selectedMatch.status !== "no_site" && selectedSite && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Relocation match
                      </p>
                      <MatchStatusPill status={selectedMatch.status} />
                    </div>
                    <p className="mt-2 text-[13px] font-semibold text-foreground">{selectedSite.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedSite.taluka}, {selectedSite.district}
                    </p>
                    {selectedMatch.status === "partial" ? (
                      <p className="mt-1.5 text-[11px] font-semibold text-amber-300 tabular-nums">
                        Phase-1 relocation: {fmtIN(selectedMatch.assignedPop)} persons — remainder in later phases
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[11px] font-semibold text-emerald-300 tabular-nums">
                        Full relocation: {fmtIN(selectedMatch.assignedPop)} persons
                      </p>
                    )}
                    <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-1 py-1.5">
                        <p className="text-xs font-semibold tabular-nums">{selectedMatch.distanceKm ?? 0} km</p>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">distance</p>
                      </div>
                      <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-1 py-1.5">
                        <p className="text-xs font-semibold tabular-nums">{fmtCompact(selectedSite.capacity)}</p>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">capacity</p>
                      </div>
                      <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-1 py-1.5">
                        <p className="text-xs font-semibold tabular-nums">
                          {(selectedSite.waterIndex * 100).toFixed(0)}/{(selectedSite.infraIndex * 100).toFixed(0)}%
                        </p>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">water / infra</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedSite.amenities.slice(0, 4).map((a) => (
                        <span
                          key={a}
                          className="rounded border border-emerald-900/50 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] text-emerald-200/80"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedMatch?.status === "no_site" && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-3">
                    <p className="flex items-start gap-2 text-[11px] font-semibold text-red-300">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Capacity gap — recommend Phase-2 site acquisition
                    </p>
                    <p className="mt-1 text-[11px] text-red-200/70">
                      No verified safe site within 130 km with remaining sustainable capacity for{" "}
                      {fmtIN(selected.population)} residents.
                    </p>
                  </div>
                )}

                {selectedMatch?.status === "in_situ" && (
                  <div className="rounded-xl border border-sky-500/40 bg-sky-500/5 p-3">
                    <p className="text-[11px] font-semibold text-sky-300">
                      Metropolitan ward — in-situ mitigation (drainage, riverbank redevelopment)
                    </p>
                    <p className="mt-1 text-[11px] text-sky-200/70">
                      Large urban population; relocation is not viable — hazard-proofing is planned instead.
                    </p>
                  </div>
                )}

                {/* actions */}
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setView("map")}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
                  >
                    <Map className="h-3.5 w-3.5" /> Open in Risk Map
                  </button>
                  <button
                    onClick={() => setView("gov-reports")}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
                  >
                    <FileText className="h-3.5 w-3.5" /> Generate Report
                  </button>
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">No habitations available.</p>
            )}
          </div>
        </Reveal>
      </div>

      {/* match routes map */}
      <Reveal delay={0.21}>
        <div className="panel p-4 sm:p-5">
          <PanelHead
            title="Match Routes Map"
            sub="Habitations with assigned safe sites — dashed line shows the selected relocation route"
            right={
              <span className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                {fmtIN(sites.length)} safe sites
              </span>
            }
          />
          <HazardMap
            habitations={data.habitations}
            sites={data.sites}
            showAlerts={false}
            showDistrictBlobs={false}
            showShelters={false}
            showInfra={false}
            showReports={false}
            height={360}
            selectedHabitationId={selectedHabitationId}
            routeLine={routeLine}
            focusTarget={focusTarget}
            onSelectHabitation={(h) => {
              setSelectedHabitationId(h.id);
              focusOn(h.lat, h.lng, 10);
            }}
          />
        </div>
      </Reveal>

      {/* methodology footnote */}
      <Reveal delay={0.24}>
        <div className="panel p-3.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-emerald-300">Methodology — </span>
            Greedy assignment by urgency desc; suitability = 100 − 1.1×distance − district-mismatch penalty +
            water/infra bonus; sites constrained by sustainable capacity; &ldquo;PHASED&rdquo; = partial relocation
            (site absorbed part of population) — remaining households planned in later phases.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
