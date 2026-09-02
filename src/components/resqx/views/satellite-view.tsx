"use client";
// ResQX — Satellite & Land-use Analysis (Sentinel-2 / Landsat change detection)
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowRight, Building2, Satellite, ShieldAlert, Sprout, Trees, Waves,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISTRICT_AREAS, areaFor } from "@/lib/static-data";
import { useResQX } from "../store";
import { SectionHeader, ScoreBar, EmptyState } from "../widgets";
import { cn } from "@/lib/utils";

const LULC_COLORS = {
  built: "#94a3b8",
  forest: "#10b981",
  agri: "#eab308",
  water: "#38bdf8",
  barren: "#b45309",
} as const;

type TabId = "landuse" | "builtup" | "vegwater" | "encroach";

const TABS: { id: TabId; label: string }[] = [
  { id: "landuse", label: "Land Use" },
  { id: "builtup", label: "Built-up Change" },
  { id: "vegwater", label: "Vegetation & Water" },
  { id: "encroach", label: "Encroachment" },
];

const chartTooltip = {
  contentStyle: {
    background: "#0a1210",
    border: "1px solid rgba(16,185,129,0.35)",
    borderRadius: 10,
    fontSize: 12,
    color: "#e7f0ec",
  },
  labelStyle: { color: "#6ee7b7", fontWeight: 600 },
  cursor: { fill: "rgba(16,185,129,0.08)" },
};

export default function SatelliteView() {
  const { data } = useResQX();
  const [tab, setTab] = useState<TabId>("landuse");

  const districts = useMemo(
    () => (data?.analytics.districtRisk ?? []).map((d) => d.district),
    [data]
  );
  const [district, setDistrict] = useState<string>("");
  const activeDistrict =
    district && districts.includes(district)
      ? district
      : districts.includes("Pune")
        ? "Pune"
        : (districts[0] ?? DISTRICT_AREAS[0].district);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Satellite & Land-use Analysis"
        subtitle="Sentinel-2 / Landsat change detection — built-up growth, vegetation loss & riverbed encroachment"
        icon={Satellite}
      />

      {/* tab bar */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-emerald-900/50 bg-[#0a1210] p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={cn(
              "min-h-[40px] rounded-lg px-4 text-[13px] font-semibold transition-colors",
              tab === t.id
                ? "bg-emerald-500/15 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35)]"
                : "text-muted-foreground hover:bg-emerald-500/8 hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="panel p-6">
          <EmptyState icon={Satellite} title="Loading satellite analytics…" hint="Fetching district land-use composites" />
        </div>
      ) : tab === "landuse" ? (
        <LandUseTab districts={districts} district={activeDistrict} onDistrict={setDistrict} />
      ) : tab === "builtup" ? (
        <BuiltUpTab />
      ) : tab === "vegwater" ? (
        <VegWaterTab />
      ) : (
        <EncroachTab />
      )}
    </div>
  );
}

/* ---------------- Land Use tab ---------------- */

function LandUseTab({
  districts,
  district,
  onDistrict,
}: {
  districts: string[];
  district: string;
  onDistrict: (d: string) => void;
}) {
  const area = areaFor(district) ?? DISTRICT_AREAS[0];
  const lulc = area.lulc;
  const builtDelta = +(lulc.built2025 - lulc.built2020).toFixed(1);

  const composition = [
    { name: "Built-up 2025", value: lulc.built2025, fill: LULC_COLORS.built },
    { name: "Forest", value: lulc.forest, fill: LULC_COLORS.forest },
    { name: "Agriculture", value: lulc.agriculture, fill: LULC_COLORS.agri },
    { name: "Water", value: lulc.water, fill: LULC_COLORS.water },
    { name: "Barren", value: lulc.barren, fill: LULC_COLORS.barren },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">District</span>
        <Select value={district} onValueChange={onDistrict}>
          <SelectTrigger className="w-[240px] border-emerald-900/60 bg-[#0a1210]" aria-label="Select district">
            <SelectValue placeholder="Select district" />
          </SelectTrigger>
          <SelectContent className="max-h-[320px] border-emerald-900/60 bg-[#0a1210]">
            {districts.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          District area <span className="font-semibold text-emerald-300">{area.areaKm2.toLocaleString("en-IN")} km²</span>
        </span>
      </div>

      {/* before / after imagery */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="panel p-4 sm:p-5"
      >
        <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <figure className="space-y-2">
            <div className="relative overflow-hidden rounded-xl border border-emerald-900/60">
              <img src="/sat-2020.png" alt="Satellite 2020" className="h-44 w-full object-cover sm:h-56" />
              <span className="absolute left-3 top-3 rounded-md border border-emerald-400/40 bg-black/65 px-2.5 py-1 text-[11px] font-bold tracking-wider text-emerald-300 backdrop-blur">
                2020
              </span>
            </div>
            <figcaption className="text-center text-[11px] text-muted-foreground">Sentinel-2 composite — pre-monsoon 2020</figcaption>
          </figure>

          <div className="flex items-center justify-center" aria-hidden>
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-emerald-400">
              <ArrowRight className="h-5 w-5 rotate-90 sm:rotate-0" />
            </div>
          </div>

          <figure className="space-y-2">
            <div className="relative overflow-hidden rounded-xl border border-emerald-900/60">
              <img src="/sat-2025.png" alt="Satellite 2025" className="h-44 w-full object-cover sm:h-56" />
              <span className="absolute left-3 top-3 rounded-md border border-red-400/40 bg-black/65 px-2.5 py-1 text-[11px] font-bold tracking-wider text-red-300 backdrop-blur">
                2025
              </span>
            </div>
            <figcaption className="text-center text-[11px] text-muted-foreground">Sentinel-2 composite — pre-monsoon 2025</figcaption>
          </figure>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Representative change-detection scene — <span className="font-semibold text-emerald-300">{district}</span>
        </p>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* stacked composition bar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="panel p-4 sm:p-5">
          <p className="mb-1 font-display text-sm font-semibold">Land-use composition — 2025</p>
          <p className="mb-4 text-[11px] text-muted-foreground">Share of district geographical area (%)</p>
          <div className="h-[110px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ district, ...Object.fromEntries(composition.map((c) => [c.name, c.value])) }]} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="district" hide />
                <Tooltip {...chartTooltip} formatter={(v: number, n: string) => [`${v}%`, n]} />
                {composition.map((c) => (
                  <Bar key={c.name} dataKey={c.name} stackId="lulc" fill={c.fill} radius={c.name === "Built-up 2025" ? [6, 0, 0, 6] : c.name === "Barren" ? [0, 6, 6, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {composition.map((c) => (
              <span key={c.name} className="flex items-center gap-1.5 text-[11px] text-foreground/85">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.fill }} />
                {c.name} <span className="font-semibold tabular-nums">{c.value}%</span>
              </span>
            ))}
          </div>
        </motion.div>

        {/* KPI chips */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="panel flex flex-col justify-between gap-4 p-4 sm:p-5">
          <p className="font-display text-sm font-semibold">Change signals — {district}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-900/60 bg-[#0a1210] p-3.5">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 text-slate-400" /> Built-up 2020 → 2025
              </div>
              <p className="mt-2 font-display text-xl font-bold tabular-nums">
                {lulc.built2020}% <ArrowRight className="inline h-4 w-4 text-muted-foreground" /> {lulc.built2025}%
              </p>
              <span className={cn(
                "mt-2 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums",
                builtDelta > 0 ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              )}>
                {builtDelta > 0 ? "+" : ""}{builtDelta} pp concretisation
              </span>
            </div>
            <div className="rounded-xl border border-emerald-900/60 bg-[#0a1210] p-3.5">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <Waves className="h-3.5 w-3.5 text-sky-400" /> Riverbed encroachment
              </div>
              <p className="mt-2 font-display text-xl font-bold tabular-nums">{lulc.encroachKm} km</p>
              <span className={cn(
                "mt-2 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold",
                lulc.encroachKm >= 12 ? "border-red-500/40 bg-red-500/10 text-red-400" : lulc.encroachKm >= 8 ? "border-orange-500/40 bg-orange-500/10 text-orange-400" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              )}>
                {lulc.encroachKm >= 12 ? "CRITICAL" : lulc.encroachKm >= 8 ? "WATCH" : "MONITORED"}
              </span>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Built-up expansion onto floodplains & forest loss directly amplify flood and landslide exposure in the ResQX composite score.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/* ---------------- Built-up Change tab ---------------- */

function BuiltUpTab() {
  const top15 = useMemo(
    () =>
      DISTRICT_AREAS.map((d) => ({
        district: d.district,
        built2020: d.lulc.built2020,
        built2025: d.lulc.built2025,
        delta: +(d.lulc.built2025 - d.lulc.built2020).toFixed(1),
        encroachKm: d.lulc.encroachKm,
      }))
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 15),
    []
  );
  const gsdmaFlags = useMemo(
    () => DISTRICT_AREAS.filter((d) => d.lulc.encroachKm >= 10).sort((a, b) => b.lulc.encroachKm - a.lulc.encroachKm).slice(0, 6),
    []
  );

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="panel p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-display text-sm font-semibold">Built-up land change by district — top 15 growth (2020 vs 2025)</p>
            <p className="text-[11px] text-muted-foreground">% of district area classified as built-up (Sentinel-2 built-up index)</p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#4b5f57" }} /> 2020</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#10b981" }} /> 2025</span>
          </div>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top15} margin={{ top: 4, right: 8, bottom: 40, left: 0 }} barGap={2}>
              <CartesianGrid stroke="rgba(16,185,129,0.08)" vertical={false} />
              <XAxis dataKey="district" tick={{ fill: "#9db8ad", fontSize: 10 }} angle={-32} textAnchor="end" interval={0} height={56} />
              <YAxis tick={{ fill: "#9db8ad", fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} width={42} />
              <Tooltip {...chartTooltip} formatter={(v: number, n: string) => [`${v}%`, n === "built2020" ? "Built-up 2020" : "Built-up 2025"]} />
              <Bar dataKey="built2020" fill="#4b5f57" radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="built2025" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 }} className="panel p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-orange-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GSDMA encroachment flags — riverbed & floodplain</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {gsdmaFlags.map((d) => (
            <span key={d.district} className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/35 bg-orange-500/8 px-3 py-1.5 text-[11px] font-medium text-orange-300">
              <Waves className="h-3 w-3" />
              {d.district} · <span className="font-bold tabular-nums">{d.lulc.encroachKm} km</span>
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Flags derived from change detection along the Godavari, Krishna–Panchganga, Ulhas and Mula-Mutha corridors; verified against GSDMA field surveys.
        </p>
      </motion.div>
    </div>
  );
}

/* ---------------- Vegetation & Water tab ---------------- */

function VegWaterTab() {
  const forest = useMemo(
    () => [...DISTRICT_AREAS].sort((a, b) => b.lulc.forest - a.lulc.forest).slice(0, 12).map((d) => ({ district: d.district, pct: d.lulc.forest })),
    []
  );
  const water = useMemo(
    () => [...DISTRICT_AREAS].sort((a, b) => b.lulc.water - a.lulc.water).slice(0, 12).map((d) => ({ district: d.district, pct: d.lulc.water })),
    []
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="panel p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Trees className="h-4 w-4 text-emerald-400" />
          <div>
            <p className="font-display text-sm font-semibold">Forest cover — top 12 districts</p>
            <p className="text-[11px] text-muted-foreground">% of geographical area under forest (2025)</p>
          </div>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forest} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
              <CartesianGrid stroke="rgba(16,185,129,0.08)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#9db8ad", fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="district" tick={{ fill: "#9db8ad", fontSize: 10 }} width={110} />
              <Tooltip {...chartTooltip} formatter={(v: number) => [`${v}%`, "Forest cover"]} cursor={{ fill: "rgba(16,185,129,0.08)" }} />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={14}>
                {forest.map((f) => (
                  <Cell key={f.district} fill="#34d399" fillOpacity={0.45 + (f.pct / 70) * 0.55} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 }} className="panel p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Waves className="h-4 w-4 text-sky-400" />
          <div>
            <p className="font-display text-sm font-semibold">Water bodies — top 12 districts</p>
            <p className="text-[11px] text-muted-foreground">% of geographical area under reservoirs, rivers & tanks (2025)</p>
          </div>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={water} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
              <CartesianGrid stroke="rgba(56,189,248,0.1)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#9db8ad", fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="district" tick={{ fill: "#9db8ad", fontSize: 10 }} width={110} />
              <Tooltip {...chartTooltip} formatter={(v: number) => [`${v}%`, "Water bodies"]} cursor={{ fill: "rgba(56,189,248,0.08)" }} />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={14}>
                {water.map((w) => (
                  <Cell key={w.district} fill="#38bdf8" fillOpacity={0.4 + (w.pct / 10) * 0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="panel flex items-start gap-3 p-4 lg:col-span-2">
        <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Vegetation & water retention are natural buffers: districts losing forest cover on the Ghats escarpment (Raigad, Satara, Pune belt) show rising
          landslide exposure, while shrinking tanks in the drought belt (Beed, Latur, Solapur) correlate with deepening groundwater stress.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Encroachment tab ---------------- */

function EncroachTab() {
  const rows = useMemo(
    () =>
      [...DISTRICT_AREAS]
        .sort((a, b) => b.lulc.encroachKm - a.lulc.encroachKm)
        .slice(0, 15)
        .map((d) => ({
          district: d.district,
          encroachKm: d.lulc.encroachKm,
          builtDelta: +(d.lulc.built2025 - d.lulc.built2020).toFixed(1),
          verdict: d.lulc.encroachKm >= 12 ? "CRITICAL" : d.lulc.encroachKm >= 8 ? "WATCH" : "MONITORED",
        })),
    []
  );
  const max = rows[0]?.encroachKm ?? 20;

  const verdictCls = (v: string) =>
    v === "CRITICAL"
      ? "border-red-500/45 bg-red-500/12 text-red-400"
      : v === "WATCH"
        ? "border-orange-500/45 bg-orange-500/12 text-orange-400"
        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="panel p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-display text-sm font-semibold">Riverbed & floodplain encroachment — top 15 districts</p>
          <p className="text-[11px] text-muted-foreground">Kilometres of riverbed/floodplain under unauthorised built use (Sentinel-2 + GSDMA survey)</p>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="rounded border border-red-500/45 bg-red-500/12 px-1.5 py-0.5 font-bold text-red-400">CRITICAL ≥ 12 km</span>
          <span className="rounded border border-orange-500/45 bg-orange-500/12 px-1.5 py-0.5 font-bold text-orange-400">WATCH ≥ 8 km</span>
          <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-400">MONITORED</span>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto thin-scrollbar pr-1">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#0a1210]">
            <tr className="border-b border-emerald-900/60 text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2.5 pr-3 font-semibold">District</th>
              <th className="py-2.5 pr-3 font-semibold">Encroached riverbed (km)</th>
              <th className="py-2.5 pr-3 font-semibold">Built-up growth</th>
              <th className="py-2.5 font-semibold">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.district} className={cn("border-b border-emerald-900/30 text-sm transition-colors hover:bg-emerald-500/5", i % 2 === 1 && "bg-white/[0.015]")}>
                <td className="py-2.5 pr-3 font-medium">{r.district}</td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-3">
                    <ScoreBar value={r.encroachKm} max={max} color="linear-gradient(90deg, #f59e0b, #ef4444)" className="w-32 sm:w-44" />
                    <span className="text-xs font-bold tabular-nums text-red-300">{r.encroachKm.toFixed(1)}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-xs tabular-nums">
                  <span className={r.builtDelta > 0 ? "font-semibold text-red-400" : "text-emerald-400"}>
                    {r.builtDelta > 0 ? "+" : ""}{r.builtDelta} pp
                  </span>
                </td>
                <td className="py-2.5">
                  <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide", verdictCls(r.verdict))}>
                    {r.verdict}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
