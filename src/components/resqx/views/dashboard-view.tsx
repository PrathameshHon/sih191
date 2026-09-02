"use client";
// ResQX — Command Centre (view: dashboard). Builds strictly against frozen
// contracts: useResQX store, widgets atoms, types.ts, engine.ts, static-data.ts.
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowRight, BellRing, ChevronRight, Landmark, LayoutDashboard,
  MapPin, RefreshCw, ShieldAlert, Truck, Users,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, RadialBar,
  RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useResQX } from "../store";
import {
  EmptyState, LiveDot, RiskBadge, ScoreBar, SectionHeader, SkeletonBlock,
  StatCard, fmtCompact, fmtIN, timeAgo,
} from "../widgets";
import { RISK_COLORS, RISK_LABELS } from "@/lib/types";
import type { AlertSeverity, RiskLevel } from "@/lib/types";
import { HAZARD_META } from "@/lib/static-data";
import { ZONE_THRESHOLDS } from "@/lib/engine";

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
    border: "1px solid rgba(16,185,129,0.28)",
    borderRadius: 10,
    fontSize: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
  },
  itemStyle: { color: "#e5f2ec" },
  labelStyle: { color: "#8aa79b", fontSize: 11 },
  cursor: { fill: "rgba(16,185,129,0.06)" },
} as const;

const LEVELS: RiskLevel[] = ["high", "medium", "low", "safe"];

const SEV_COLOR: Record<AlertSeverity, string> = {
  critical: "#ef4444",
  warning: "#f97316",
  advisory: "#eab308",
  watch: "#10b981",
};

const SEV_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, advisory: 2, watch: 3 };

// ---------- view ----------

export default function DashboardView() {
  const { data, loading, error, refresh, setView } = useResQX();

  const activeAlerts = useMemo(
    () =>
      (data?.alerts ?? [])
        .filter((a) => a.active)
        .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || +new Date(b.issuedAt) - +new Date(a.issuedAt)),
    [data]
  );

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <SkeletonBlock className="h-14" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24" />
          ))}
        </div>
        <SkeletonBlock className="h-72" />
        <SkeletonBlock className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <SectionHeader
          title="Command Centre"
          subtitle="Live multi-hazard situation — Maharashtra"
          icon={LayoutDashboard}
        />
        <div className="panel flex flex-col items-center gap-4 p-8">
          <EmptyState
            icon={AlertTriangle}
            title="Live data unavailable"
            hint={error ?? "Could not reach the ResQX control plane."}
          />
          <button
            onClick={() => refresh()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry connection
          </button>
        </div>
      </div>
    );
  }

  const { analytics, alerts } = data;
  const totals = analytics.totals;

  // zone stats (fixed level order, zero-filled)
  const zoneMap = new Map<RiskLevel, { habitations: number; population: number }>();
  for (const zs of analytics.zoneStats) zoneMap.set(zs.level, { habitations: zs.habitations, population: zs.population });
  const zoneLegend = LEVELS.map((lv) => ({ level: lv, ...(zoneMap.get(lv) ?? { habitations: 0, population: 0 }) }));
  const pieData = zoneLegend
    .filter((z) => z.population > 0)
    .map((z) => ({ name: RISK_LABELS[z.level], value: z.population, level: z.level }));

  // hazard-wise exposure (labels from HAZARD_META)
  const exposure = analytics.hazardPopulation.map((hp) => {
    const meta = HAZARD_META.find((m) => m.key === hp.hazard);
    return { name: meta ? meta.label.replace(" Hazard", "") : hp.hazard, high: hp.high, medium: hp.medium, low: hp.low };
  });

  const relief = analytics.reliefSummary;
  const reliefPct = relief.budgetCr > 0 ? (relief.spentCr / relief.budgetCr) * 100 : 0;
  const util = Math.max(0, Math.min(100, totals.capacityUtilization));

  const kpis = [
    {
      label: "Total Habitations",
      value: fmtIN(totals.habitations),
      sub: `${totals.districts} districts surveyed`,
      icon: MapPin,
      tone: "default" as const,
    },
    {
      label: "High-Risk Red Zones",
      value: fmtIN(totals.highRiskHabitations),
      sub: `weighted composite \u2265 ${ZONE_THRESHOLDS.high}`,
      icon: ShieldAlert,
      tone: "danger" as const,
    },
    {
      label: "Population at Risk",
      value: fmtCompact(totals.populationAtRisk),
      sub: `of ${fmtCompact(totals.population)} surveyed`,
      icon: Users,
      tone: "danger" as const,
    },
    {
      label: "Safe Relocation Capacity",
      value: fmtIN(totals.totalCapacity),
      sub: `${totals.safeSites} safe sites assessed`,
      icon: Landmark,
      tone: "success" as const,
    },
    {
      label: "Matched Plans",
      value: fmtIN(totals.matched),
      sub: `${totals.unmatched} capacity gap`,
      icon: Truck,
      tone: "default" as const,
    },
    {
      label: "Active Alerts",
      value: fmtIN(activeAlerts.length),
      sub: "IMD · CWC · GSDMA",
      icon: BellRing,
      tone: "warning" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Command Centre"
        subtitle="Live multi-hazard situation — Maharashtra"
        icon={LayoutDashboard}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold tracking-widest text-emerald-300">
            <LiveDot /> LIVE
          </span>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <StatCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} tone={k.tone} delay={0.03 * i} />
        ))}
      </div>

      {/* main grid: risk distribution + top priority relocations */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Reveal delay={0.18} className="lg:col-span-2">
          <div className="panel panel-hover h-full p-4 sm:p-5">
            <PanelHead
              title="Risk Distribution"
              sub="Habitations classified by weighted composite hazard score"
              right={
                <span className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                  {totals.habitations} habitations
                </span>
              }
            />
            <div className="relative">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Tooltip
                    {...TOOLTIP}
                    formatter={(v: unknown, n: unknown) => [`${fmtCompact(Number(v))} residents`, String(n)]}
                  />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={88}
                    paddingAngle={3}
                    cornerRadius={5}
                    stroke="#0a1210"
                    strokeWidth={2}
                  >
                    {pieData.map((p) => (
                      <Cell key={p.level} fill={RISK_COLORS[p.level]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-display text-xl font-bold tabular-nums">{fmtCompact(totals.population)}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">residents surveyed</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {zoneLegend.map((z) => (
                <div
                  key={z.level}
                  className="flex items-center gap-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-2.5 py-2"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: RISK_COLORS[z.level] }} />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/85">{RISK_LABELS[z.level]}</span>
                  <span className="whitespace-nowrap text-[11px] font-semibold tabular-nums">{z.habitations} hab.</span>
                  <span className="w-14 text-right text-[11px] text-muted-foreground tabular-nums">
                    {fmtCompact(z.population)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.21}>
          <div className="panel panel-hover flex h-full flex-col p-4 sm:p-5">
            <PanelHead
              title="Top Priority Relocations"
              sub="Ranked by composite urgency (hazard + vulnerability)"
              right={
                <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-400">
                  TOP {Math.min(8, analytics.topVulnerable.length)}
                </span>
              }
            />
            <div className="thin-scrollbar max-h-[420px] flex-1 space-y-1 overflow-y-auto pr-1">
              {analytics.topVulnerable.slice(0, 8).map((h) => (
                <button
                  key={h.id}
                  onClick={() => setView("relocation")}
                  className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 text-left transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/5"
                >
                  <span className="w-7 shrink-0 text-center font-display text-sm font-bold text-emerald-500/80 tabular-nums">
                    {h.priorityRank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-foreground">{h.name}</p>
                      <RiskBadge level={h.riskLevel} className="shrink-0" />
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {h.district} · {h.taluka} · {fmtCompact(h.population)} people
                    </p>
                    <ScoreBar value={h.urgency * 100} right={`${Math.round(h.urgency * 100)}%`} className="mt-1.5" />
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-emerald-700 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-400" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setView("relocation")}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
            >
              Open relocation planner <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Reveal>
      </div>

      {/* hazard exposure + district leaderboard */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Reveal delay={0.24}>
          <div className="panel panel-hover h-full p-4 sm:p-5">
            <PanelHead title="Hazard-wise Population Exposure" sub="Residents inside each risk band, per hazard" />
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={exposure} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(16,185,129,0.08)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#8aa79b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(16,185,129,0.2)" }}
                  interval={0}
                />
                <YAxis
                  tick={{ fill: "#8aa79b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v: unknown) => fmtCompact(Number(v))}
                />
                <Tooltip {...TOOLTIP} formatter={(v: unknown, n: unknown) => [fmtCompact(Number(v)) + " residents", String(n)]} />
                <Legend iconSize={8} formatter={(v: unknown) => <span className="text-[10px] text-muted-foreground">{String(v)}</span>} />
                <Bar dataKey="high" name="High risk" stackId="expo" fill="#ef4444" />
                <Bar dataKey="medium" name="Medium risk" stackId="expo" fill="#f97316" />
                <Bar dataKey="low" name="Low risk" stackId="expo" fill="#eab308" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Reveal>

        <Reveal delay={0.27}>
          <div className="panel panel-hover flex h-full flex-col p-4 sm:p-5">
            <PanelHead
              title="District Risk Leaderboard"
              sub="Worst districts by average hazard score — click to open map"
              right={
                <span className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                  {analytics.districtRisk.length} districts
                </span>
              }
            />
            <div className="thin-scrollbar max-h-[420px] flex-1 space-y-1 overflow-y-auto pr-1">
              {analytics.districtRisk.slice(0, 8).map((d) => (
                <button
                  key={d.district}
                  onClick={() => setView("map")}
                  className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 text-left transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold text-foreground">{d.district}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        {fmtCompact(d.atRisk)} at risk
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <ScoreBar value={d.hazardScore} className="flex-1" />
                      <RiskBadge level={d.riskLevel} className="shrink-0" />
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-emerald-700 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-400" />
                </button>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* bottom row: early warnings + relief + capacity */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Reveal delay={0.3}>
          <div className="panel panel-hover flex h-full flex-col p-4 sm:p-5">
            <PanelHead title="Active Early Warnings" sub="Live bulletins from national & state agencies" />
            <div className="flex-1 space-y-1.5">
              {activeAlerts.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 rounded-lg border border-emerald-900/40 px-2.5 py-2.5">
                  <span className="relative mt-1.5 flex h-2 w-2 shrink-0">
                    {a.severity === "critical" && (
                      <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                        style={{ background: SEV_COLOR[a.severity] }}
                      />
                    )}
                    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: SEV_COLOR[a.severity] }} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{a.title}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {a.district} · {timeAgo(a.issuedAt)} · {a.source}
                    </p>
                  </div>
                </div>
              ))}
              {activeAlerts.length === 0 && <EmptyState icon={BellRing} title="No active warnings" hint="All-clear across monitored districts." />}
            </div>
            <button
              onClick={() => setView("alerts")}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
            >
              View all alerts <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Reveal>

        <Reveal delay={0.33}>
          <div className="panel panel-hover flex h-full flex-col p-4 sm:p-5">
            <PanelHead title="Relief & Rehabilitation" sub={`${relief.projects} active projects — SDRF / NDRF / state plans`} />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sanctioned</p>
                <p className="mt-1 font-display text-xl font-bold tabular-nums">
                  ₹{relief.budgetCr.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">Cr</span>
                </p>
              </div>
              <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Utilised</p>
                <p className="mt-1 font-display text-xl font-bold text-emerald-400 tabular-nums">
                  ₹{relief.spentCr.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">Cr</span>
                </p>
              </div>
            </div>
            <ScoreBar
              value={reliefPct}
              label="Fund utilisation"
              right={`${reliefPct.toFixed(1)}%`}
              color="#10b981"
              className="mt-4"
            />
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-emerald-900/40 pt-3">
              <div>
                <p className="font-display text-lg font-bold tabular-nums">{fmtIN(relief.beneficiaries)}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Beneficiaries reached</p>
              </div>
              <div>
                <p className="font-display text-lg font-bold tabular-nums">{fmtCompact(totals.populationAtRisk)}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Still to be covered</p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.36}>
          <div className="panel panel-hover flex h-full flex-col p-4 sm:p-5">
            <PanelHead title="Capacity Utilization" sub="Assigned population vs assessed safe-site capacity" />
            <div className="relative mx-auto h-[150px] w-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="78%" outerRadius="100%" data={[{ name: "util", value: util }]} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={999} fill="#10b981" background={{ fill: "rgba(16,185,129,0.10)" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-display text-2xl font-bold tabular-nums">{Math.round(util)}%</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">utilised</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-emerald-900/40 pt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Matched plans</span>
                <span className="font-semibold text-emerald-400 tabular-nums">{fmtIN(totals.matched)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Capacity gap</span>
                <span className="font-semibold text-red-400 tabular-nums">{fmtIN(totals.unmatched)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg urgency index</span>
                <span className="font-semibold tabular-nums">{totals.avgUrgency.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => setView("capacity")}
              className="mt-auto inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
            >
              Carrying capacity details <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
