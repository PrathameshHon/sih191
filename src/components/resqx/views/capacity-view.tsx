"use client";
// ResQX — Carrying Capacity Assessment (view: capacity). Part 2 of the core flow:
// Vulnerability → Capacity → Relocation. Builds strictly against frozen
// contracts: useResQX store, widgets atoms, types.ts, engine.ts.
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, Calculator, Droplets, Landmark, Layers, Ruler, TrendingUp, UserCheck, Users, Waves, Zap,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useResQX } from "../store";
import {
  ScoreBar, SectionHeader, SkeletonBlock, StatCard, fmtCompact, fmtIN,
} from "../widgets";
import { PERSONS_PER_HA } from "@/lib/engine";

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

const TOOLTIP = {
  contentStyle: {
    background: "#0c1411",
    border: "1px solid rgba(16,185,129,0.3)",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
  },
  itemStyle: { color: "#e5f2ec" },
  labelStyle: { color: "#8aa79b", fontSize: 11 },
  cursor: { fill: "rgba(16,185,129,0.06)" },
} as const;

function utilColor(pct: number): string {
  if (pct > 95) return "#ef4444";
  if (pct > 80) return "#f97316";
  return "#10b981";
}

// ---------- view ----------

export default function CapacityView() {
  const { data, loading, focusOn, setSelectedSiteId, selectedSiteId } = useResQX();

  const sites = useMemo(() => data?.sites ?? [], [data]);
  const matches = useMemo(() => data?.matches ?? [], [data]);
  const habitations = useMemo(() => data?.habitations ?? [], [data]);

  const totals = useMemo(() => {
    const capacity = sites.reduce((a, s) => a + s.capacity, 0);
    const occupied = sites.reduce((a, s) => a + s.occupied, 0);
    return { capacity, occupied, headroom: capacity - occupied };
  }, [sites]);

  const topSites = useMemo(
    () => [...sites].sort((a, b) => b.capacity - a.capacity).slice(0, 14),
    [sites]
  );

  const chartData = useMemo(
    () =>
      topSites.map((s) => ({
        name: s.name.length > 14 ? `${s.name.slice(0, 14)}…` : s.name,
        capacity: s.capacity,
        occupied: s.occupied,
      })),
    [topSites]
  );

  const gap = useMemo(() => {
    const byDistrict = new Map<string, number>();
    let strandedHabitations = 0;
    let strandedPop = 0;
    for (const m of matches) {
      if (m.status !== "no_site") continue;
      const h = habitations.find((x) => x.id === m.habitationId);
      if (!h) continue;
      strandedHabitations += 1;
      strandedPop += h.population;
      byDistrict.set(h.district, (byDistrict.get(h.district) ?? 0) + h.population);
    }
    const districts = [...byDistrict.entries()].sort((a, b) => b[1] - a[1]);
    return { strandedHabitations, strandedPop, districts };
  }, [matches, habitations]);

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <SkeletonBlock className="h-14" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24" />
          ))}
        </div>
        <SkeletonBlock className="h-80" />
        <SkeletonBlock className="h-72" />
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    {
      label: "Candidate Sites",
      value: fmtIN(sites.length),
      sub: "assessed across Maharashtra",
      icon: Layers,
      tone: "default" as const,
    },
    {
      label: "Sustainable Capacity",
      value: fmtIN(totals.capacity),
      sub: "persons — land × water × infra",
      icon: Users,
      tone: "success" as const,
    },
    {
      label: "Assigned by Matching",
      value: fmtIN(totals.occupied),
      sub: `${totals.capacity ? ((totals.occupied / totals.capacity) * 100).toFixed(1) : "0"}% utilisation`,
      icon: UserCheck,
      tone: "warning" as const,
    },
    {
      label: "Remaining Headroom",
      value: fmtIN(totals.headroom),
      sub: "unassigned safe capacity",
      icon: TrendingUp,
      tone: "default" as const,
    },
  ];

  const modelChips = [
    { icon: Calculator, text: "capacity = min(land, water, infra)" },
    {
      icon: Ruler,
      text: `persons/ha — barren ${PERSONS_PER_HA.barren} · govt ${PERSONS_PER_HA.government} · plateau ${PERSONS_PER_HA.plateau} · pasture ${PERSONS_PER_HA.pasture} · farmland ${PERSONS_PER_HA.farmland}`,
    },
    { icon: Droplets, text: "Water 250 p/ha × water index" },
    { icon: Zap, text: "Infra 280 p/ha × infra index" },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Carrying Capacity Assessment"
        subtitle="How many people can candidate safe sites actually sustain? Land × water × infrastructure constraints"
        icon={Landmark}
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <StatCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} tone={k.tone} delay={0.03 * i} />
        ))}
      </div>

      {/* capacity model strip */}
      <Reveal delay={0.15}>
        <div className="panel p-4">
          <PanelHead title="Capacity Model" sub="Sustainable person capacity per site — binding-constraint formula" />
          <div className="flex flex-wrap gap-2">
            {modelChips.map((c) => (
              <span
                key={c.text}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-1.5 text-[11px] text-emerald-100/90 tabular-nums"
              >
                <c.icon className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                {c.text}
              </span>
            ))}
          </div>
        </div>
      </Reveal>

      {/* capacity vs utilization chart */}
      <Reveal delay={0.18}>
        <div className="panel p-4 sm:p-5">
          <PanelHead
            title="Site Capacity vs Utilization"
            sub={`Top ${topSites.length} sites by assessed sustainable capacity`}
            right={
              <span className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                persons
              </span>
            }
          />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="rgba(16,185,129,0.08)" vertical={false} />
              <XAxis
                dataKey="name"
                angle={-25}
                textAnchor="end"
                height={60}
                interval={0}
                tick={{ fill: "#8aa79b", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(16,185,129,0.2)" }}
              />
              <YAxis
                tick={{ fill: "#8aa79b", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v: unknown) => fmtCompact(Number(v))}
              />
              <Tooltip {...TOOLTIP} formatter={(v: unknown, n: unknown) => [`${fmtIN(Number(v))} persons`, String(n)]} />
              <Legend iconSize={8} formatter={(v: unknown) => <span className="text-[10px] text-muted-foreground">{String(v)}</span>} />
              <Bar dataKey="capacity" name="Sustainable capacity" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="occupied" name="Assigned" fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Reveal>

      {/* sites grid */}
      <Reveal delay={0.21}>
        <div className="panel p-4 sm:p-5">
          <PanelHead
            title="Candidate Safe Sites"
            sub="Click a site to focus it on the risk map"
            right={
              <span className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                {fmtIN(sites.length)} sites
              </span>
            }
          />
          <div className="thin-scrollbar max-h-[520px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sites.map((s) => {
                const util = s.capacity > 0 ? (s.occupied / s.capacity) * 100 : 0;
                const remaining = Math.max(0, s.capacity - s.occupied);
                const isSelected = s.id === selectedSiteId;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      focusOn(s.lat, s.lng, 10);
                      setSelectedSiteId(s.id);
                    }}
                    className={`panel panel-hover rounded-xl p-4 text-left transition-colors ${
                      isSelected ? "border-emerald-500/40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-foreground">{s.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {s.taluka}, {s.district}
                        </p>
                      </div>
                      <Waves className="h-4 w-4 shrink-0 text-emerald-600" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <p className="font-display text-2xl font-bold text-emerald-400 tabular-nums">{fmtIN(s.capacity)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">persons capacity</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      <ScoreBar label="Water" value={s.waterIndex * 100} color="#38bdf8" />
                      <ScoreBar label="Infrastructure" value={s.infraIndex * 100} color="#a3e635" />
                      <ScoreBar
                        label="Utilization"
                        value={util}
                        right={`${Math.round(util)}%`}
                        color={utilColor(util)}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {s.amenities.slice(0, 3).map((a) => (
                        <span
                          key={a}
                          className="rounded border border-emerald-900/50 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] text-emerald-200/80"
                        >
                          {a}
                        </span>
                      ))}
                      {s.amenities.length > 3 && (
                        <span className="rounded border border-emerald-900/50 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{s.amenities.length - 3}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-emerald-900/40 pt-2.5 text-[10px] text-muted-foreground">
                      <span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 font-medium capitalize text-emerald-300">
                        {s.landUse}
                      </span>
                      <span className="tabular-nums">{s.landHa} ha</span>
                      <span className="tabular-nums">{s.connectivityKm} km road</span>
                      <span className="font-semibold text-emerald-300 tabular-nums">{fmtCompact(remaining)} free</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Reveal>

      {/* gap analysis */}
      <Reveal delay={0.24}>
        <div className="panel border-red-500/30 p-4 sm:p-5">
          <PanelHead
            title="Capacity Gap Analysis"
            sub="Habitations the current matching could not place at any safe site"
            right={<AlertTriangle className="h-4 w-4 text-red-400" />}
          />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="grid grid-cols-2 gap-3 lg:col-span-1 lg:grid-cols-1">
              <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3">
                <p className="font-display text-2xl font-bold text-red-400 tabular-nums">{fmtIN(gap.strandedHabitations)}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Stranded habitations</p>
              </div>
              <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3">
                <p className="font-display text-2xl font-bold text-red-400 tabular-nums">{fmtCompact(gap.strandedPop)}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Persons without a site</p>
              </div>
            </div>
            <div className="lg:col-span-2">
              <p className="mb-2 text-xs text-foreground/90">
                Recommend Phase-2 land acquisition in
                <span className="ml-1 font-semibold text-red-300">
                  {gap.districts.length ? gap.districts.slice(0, 3).map(([d]) => d).join(", ") : "— no gaps"}
                </span>
              </p>
              <div className="space-y-1.5">
                {gap.districts.slice(0, 3).map(([district, pop], rank) => (
                  <div
                    key={district}
                    className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-red-500/40 bg-red-500/10 font-display text-[10px] font-bold text-red-300 tabular-nums">
                      {rank + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{district}</p>
                    <span className="shrink-0 text-[11px] text-red-300 tabular-nums">{fmtCompact(pop)} stranded</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
