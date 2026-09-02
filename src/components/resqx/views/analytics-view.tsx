"use client";
// ResQX — Advanced Analytics (view: analytics). Builds strictly against frozen
// contracts: useResQX store, widgets atoms, types.ts, engine.ts, static-data.ts.
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, MapPin, PieChart as PieChartIcon, SlidersHorizontal, Users,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useResQX } from "../store";
import { RiskBadge, ScoreBar, SectionHeader, SkeletonBlock, StatCard, fmtCompact, fmtIN } from "../widgets";
import { RISK_COLORS, RISK_LABELS } from "@/lib/types";
import type { HazardKey, RiskLevel } from "@/lib/types";
import { HAZARD_META, areaFor } from "@/lib/static-data";
import { ZONE_THRESHOLDS, zoneFor } from "@/lib/engine";

// ---------- local helpers ----------

type MetricKey = "composite" | HazardKey;
type SortKey = "score" | "population" | "atrisk";

const LEVELS: RiskLevel[] = ["high", "medium", "low", "safe"];

const METRIC_LABEL: Record<MetricKey, string> = {
  composite: "Composite",
  flood: "Flood",
  landslide: "Landslide",
  earthquake: "Earthquake",
  cyclone: "Cyclone",
  drought: "Drought",
};

const SORT_LABEL: Record<SortKey, string> = {
  score: "Risk score",
  population: "Population",
  atrisk: "At-risk population",
};

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

interface Row {
  district: string;
  habitations: number;
  population: number;
  atRisk: number;
  score: number;
  level: RiskLevel;
  areaKm2: number;
}

interface ScatterPoint {
  x: number;
  y: number;
  district: string;
  score: number;
  atRisk: number;
  habitations: number;
  population: number;
  level: RiskLevel;
  color: string;
}

function ScatterTip({
  active,
  payload,
  metricLabel,
}: {
  active?: boolean;
  payload?: { payload?: ScatterPoint }[];
  metricLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-[#0c1411] px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-foreground">{p.district}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
        {metricLabel} score {p.score.toFixed(1)} · at risk {fmtCompact(p.atRisk)}
      </p>
      <p className="text-[11px] text-muted-foreground tabular-nums">
        {p.habitations} habitations · {fmtCompact(p.population)} residents
      </p>
    </div>
  );
}

// scatter marker sized by number of habitations in the district
function scatterShape(props: unknown) {
  const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: ScatterPoint };
  if (typeof cx !== "number" || typeof cy !== "number" || !payload) return <g />;
  const r = 4 + Math.min(payload.habitations, 8) * 0.8;
  return (
    <circle cx={cx} cy={cy} r={r} fill={payload.color} fillOpacity={0.72} stroke={payload.color} strokeWidth={1.2} />
  );
}

// ---------- view ----------

export default function AnalyticsView() {
  const { data, loading } = useResQX();
  const [metric, setMetric] = useState<MetricKey>("composite");
  const [sortKey, setSortKey] = useState<SortKey>("score");

  const rows: Row[] = useMemo(() => {
    const analytics = data?.analytics;
    const habitations = data?.habitations ?? [];
    if (!analytics) return [];
    const byDistrict = new Map<string, typeof habitations>();
    for (const h of habitations) {
      const list = byDistrict.get(h.district);
      if (list) list.push(h);
      else byDistrict.set(h.district, [h]);
    }
    return analytics.districtRisk.map((d) => {
      const list = byDistrict.get(d.district) ?? [];
      let score = d.hazardScore;
      let level = d.riskLevel;
      if (metric !== "composite" && list.length > 0) {
        score = list.reduce((acc, h) => acc + h.scores[metric], 0) / list.length;
        score = Math.round(score * 10) / 10;
        level = zoneFor(score);
      }
      return {
        district: d.district,
        habitations: d.habitations,
        population: d.population,
        atRisk: d.atRisk,
        score,
        level,
        areaKm2: areaFor(d.district)?.areaKm2 ?? 0,
      };
    });
  }, [data, metric]);

  const sorted: Row[] = useMemo(
    () =>
      [...rows].sort((a, b) =>
        sortKey === "score" ? b.score - a.score : sortKey === "population" ? b.population - a.population : b.atRisk - a.atRisk
      ),
    [rows, sortKey]
  );

  const scatterPoints: ScatterPoint[] = useMemo(
    () =>
      rows.map((r) => ({
        x: r.score,
        y: r.atRisk,
        district: r.district,
        score: r.score,
        atRisk: r.atRisk,
        habitations: r.habitations,
        population: r.population,
        level: r.level,
        color: RISK_COLORS[r.level],
      })),
    [rows]
  );

  const top12 = useMemo(() => sorted.slice(0, 12), [sorted]);

  const areaByLevel = useMemo(
    () =>
      LEVELS.map((lv) => ({
        level: lv,
        name: RISK_LABELS[lv],
        value: rows.filter((r) => r.level === lv).reduce((acc, r) => acc + r.areaKm2, 0),
      })).filter((d) => d.value > 0),
    [rows]
  );
  const totalArea = areaByLevel.reduce((acc, d) => acc + d.value, 0);

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <SkeletonBlock className="h-14" />
        <SkeletonBlock className="h-20" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24" />
          ))}
        </div>
        <SkeletonBlock className="h-72" />
        <SkeletonBlock className="h-64" />
      </div>
    );
  }

  if (!data) return null;

  const analytics = data.analytics;

  // KPIs (reflect the currently selected metric)
  const avgScore = rows.length > 0 ? rows.reduce((acc, r) => acc + r.score, 0) / rows.length : 0;
  const worst = rows.reduce<Row | null>((best, r) => (!best || r.score > best.score ? r : best), null);
  const highDistricts = rows.filter((r) => r.level === "high");
  const popHigh = highDistricts.reduce((acc, r) => acc + r.population, 0);

  const metricMeta = metric === "composite" ? null : HAZARD_META.find((m) => m.key === metric);
  const metricLabel = METRIC_LABEL[metric];
  const maxAtRisk = rows.reduce((m, r) => Math.max(m, r.atRisk), 0);

  const kpis = [
    {
      label: "Districts Covered",
      value: fmtIN(rows.length),
      sub: "Maharashtra survey grid",
      icon: MapPin,
      tone: "default" as const,
    },
    {
      label: `Avg ${metricLabel} Score`,
      value: avgScore.toFixed(1),
      sub: "district mean, 0–100 scale",
      icon: SlidersHorizontal,
      tone: "default" as const,
    },
    {
      label: "Highest-Risk District",
      value: worst ? worst.district : "—",
      sub: worst ? `${metricLabel} score ${worst.score.toFixed(1)}` : "no data",
      icon: AlertTriangle,
      tone: "danger" as const,
    },
    {
      label: "Pop. in High-Risk Districts",
      value: fmtCompact(popHigh),
      sub: `${highDistricts.length} districts classified high`,
      icon: Users,
      tone: "danger" as const,
    },
  ];

  const buckets = analytics.vulnerabilityBuckets;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Advanced Analytics"
        subtitle="District-level risk intelligence & trends"
        icon={PieChartIcon}
      />

      {/* filter row */}
      <Reveal delay={0.03}>
        <div className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="metric-select" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Metric
              </label>
              <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
                <SelectTrigger id="metric-select" className="h-11 w-[210px] text-xs">
                  <SelectValue placeholder="Metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="composite" className="text-xs">Composite Risk</SelectItem>
                  {HAZARD_META.map((m) => (
                    <SelectItem key={m.key} value={m.key} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="sort-select" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sort by
              </label>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger id="sort-select" className="h-11 w-[190px] text-xs">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {SORT_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="max-w-sm text-[11px] leading-relaxed text-muted-foreground">
            {metricMeta
              ? metricMeta.desc
              : `Weighted composite — flood 0.32 · landslide 0.22 · drought 0.16 · earthquake 0.16 · cyclone 0.14. Red zone \u2265 ${ZONE_THRESHOLDS.high}.`}
          </p>
        </div>
      </Reveal>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <StatCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} tone={k.tone} delay={0.03 * (i + 1)} />
        ))}
      </div>

      {/* district risk matrix (scatter) */}
      <Reveal delay={0.18}>
        <div className="panel panel-hover p-4 sm:p-5">
          <PanelHead
            title="District Risk Matrix"
            sub={`X = ${metricLabel.toLowerCase()} hazard score · Y = population at risk · marker size = habitations`}
            right={
              <div className="flex flex-wrap items-center gap-2">
                {LEVELS.map((lv) => (
                  <span key={lv} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: RISK_COLORS[lv] }} />
                    {lv.toUpperCase()}
                  </span>
                ))}
              </div>
            }
          />
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="rgba(16,185,129,0.08)" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, 100]}
                ticks={[0, 16, 32, 48, 64, 80, 100]}
                tick={{ fill: "#8aa79b", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(16,185,129,0.2)" }}
                label={{ value: "Hazard score", position: "insideBottomRight", offset: -2, fill: "#8aa79b", fontSize: 10 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, Math.ceil(maxAtRisk * 1.15)]}
                tick={{ fill: "#8aa79b", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v: unknown) => fmtCompact(Number(v))}
              />
              <Tooltip content={<ScatterTip metricLabel={metricLabel} />} cursor={{ strokeDasharray: "4 4", stroke: "rgba(16,185,129,0.25)" }} />
              <ReferenceLine
                x={ZONE_THRESHOLDS.high}
                stroke="#ef4444"
                strokeDasharray="5 4"
                label={{ value: `RED ZONE \u2265 ${ZONE_THRESHOLDS.high}`, position: "insideTopRight", fill: "#ef4444", fontSize: 9 }}
              />
              {LEVELS.map((lv) => {
                const pts = scatterPoints.filter((p) => p.level === lv);
                if (pts.length === 0) return null;
                return (
                  <Scatter
                    key={lv}
                    name={RISK_LABELS[lv]}
                    data={pts}
                    fill={RISK_COLORS[lv]}
                    shape={scatterShape}
                    isAnimationActive={false}
                  />
                );
              })}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Reveal>

      {/* hazard score bars + area share pie */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Reveal delay={0.21}>
          <div className="panel panel-hover h-full p-4 sm:p-5">
            <PanelHead
              title={`Hazard Score by District — ${metricLabel}`}
              sub={`Top 12 by ${SORT_LABEL[sortKey].toLowerCase()} (0–100)`}
            />
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={top12} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="rgba(16,185,129,0.08)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: "#8aa79b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(16,185,129,0.2)" }}
                />
                <YAxis
                  type="category"
                  dataKey="district"
                  width={112}
                  tick={{ fill: "#8aa79b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  {...TOOLTIP}
                  formatter={(v: unknown) => [`${Number(v).toFixed(1)} / 100`, `${metricLabel} score`]}
                />
                <Bar dataKey="score" barSize={13} radius={[0, 4, 4, 0]}>
                  {top12.map((r) => (
                    <Cell key={r.district} fill={RISK_COLORS[r.level]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="panel panel-hover h-full p-4 sm:p-5">
            <PanelHead title="Risk Level Share of Area" sub="District area (km²) aggregated by risk classification" />
            <div className="relative">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Tooltip
                    {...TOOLTIP}
                    formatter={(v: unknown, n: unknown) => [`${fmtIN(Number(v))} km²`, String(n)]}
                  />
                  <Pie
                    data={areaByLevel}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={85}
                    paddingAngle={3}
                    cornerRadius={5}
                    stroke="#0a1210"
                    strokeWidth={2}
                  >
                    {areaByLevel.map((d) => (
                      <Cell key={d.level} fill={RISK_COLORS[d.level]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-display text-lg font-bold tabular-nums">{fmtIN(totalArea)}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">km² total</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {areaByLevel.map((d) => (
                <div
                  key={d.level}
                  className="flex items-center gap-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-2.5 py-2"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: RISK_COLORS[d.level] }} />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/85">{d.name}</span>
                  <span className="text-[11px] font-semibold tabular-nums">{fmtIN(d.value)} km²</span>
                  <span className="w-12 text-right text-[11px] text-muted-foreground tabular-nums">
                    {totalArea > 0 ? ((d.value / totalArea) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground/70">
              Areas joined from DISTRICT_AREAS reference table; unlisted districts contribute 0 km².
            </p>
          </div>
        </Reveal>
      </div>

      {/* vulnerability index distribution */}
      <Reveal delay={0.27}>
        <div className="panel panel-hover p-4 sm:p-5">
          <PanelHead title="Vulnerability Index Distribution" sub="Habitations grouped by social vulnerability (VI)" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(16,185,129,0.08)" vertical={false} />
              <XAxis
                dataKey="bucket"
                tick={{ fill: "#8aa79b", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(16,185,129,0.2)" }}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#8aa79b", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip {...TOOLTIP} formatter={(v: unknown) => [`${fmtIN(Number(v))} habitations`, "Count"]} />
              <Bar dataKey="count" fill="#34d399" barSize={44} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 border-t border-emerald-900/40 pt-2.5 text-[11px] text-muted-foreground">
            Methodology — VI = 0.32·kutcha housing + 0.22·SC/ST share + 0.18·(1−literacy) + 0.16·infra deficit + 0.12·settlement scale.
          </p>
        </div>
      </Reveal>

      {/* full district table */}
      <Reveal delay={0.3}>
        <div className="panel panel-hover p-4 sm:p-5">
          <PanelHead
            title="Full District Table"
            sub={`${sorted.length} districts · metric: ${metricLabel} · sorted by ${SORT_LABEL[sortKey].toLowerCase()}`}
            right={
              <span className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                {fmtIN(rows.reduce((acc, r) => acc + r.habitations, 0))} habitations
              </span>
            }
          />
          <div className="thin-scrollbar max-h-[420px] overflow-y-auto rounded-lg border border-emerald-900/40">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#0c1411]">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-3 py-2.5 font-semibold">District</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Habitations</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Population</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">At Risk</th>
                  <th scope="col" className="w-[150px] px-3 py-2.5 font-semibold">{metricLabel} Score</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/30">
                {sorted.map((r) => (
                  <tr key={r.district} className="transition-colors hover:bg-emerald-500/5">
                    <td className="px-3 py-2 font-medium text-foreground">{r.district}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.habitations}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtIN(r.population)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-orange-300">{fmtCompact(r.atRisk)}</td>
                    <td className="px-3 py-2">
                      <ScoreBar value={r.score} right={r.score.toFixed(1)} className="min-w-[110px]" />
                    </td>
                    <td className="px-3 py-2">
                      <RiskBadge level={r.level} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
