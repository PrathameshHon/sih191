"use client";
// ResQX — What-if Disaster Simulation (client-side engine, live red-zone recolor)
import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { FlaskConical, RotateCcw, Play, TrendingUp, Users, UserMinus, MapPinned } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_SIM, haversineKm, runSimulation } from "@/lib/engine";
import type { Habitation, SimParams } from "@/lib/types";
import { useResQX } from "../store";
import { SectionHeader, StatCard, fmtCompact, fmtIN } from "../widgets";
import { cn } from "@/lib/utils";

const HazardMap = dynamic(() => import("../hazard-map"), { ssr: false });

type SimKey = keyof SimParams;

interface SliderSpec {
  key: SimKey;
  label: string;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  hint: string;
}

const SLIDERS: SliderSpec[] = [
  { key: "rainfallPct", label: "Rainfall anomaly", min: -30, max: 80, step: 5, fmt: (v) => `${v > 0 ? "+" : ""}${v} %`, hint: "IMD monsoon departure" },
  { key: "riverRiseM", label: "River rise", min: 0, max: 6, step: 0.5, fmt: (v) => `${v.toFixed(1)} m`, hint: "CWC gauge above danger level" },
  { key: "quakeMag", label: "Earthquake magnitude", min: 3, max: 7, step: 0.2, fmt: (v) => `M ${v.toFixed(1)}`, hint: "Killari / Koyna scenario" },
  { key: "cyclonePct", label: "Cyclone intensification", min: 0, max: 60, step: 5, fmt: (v) => `${v > 0 ? "+" : ""}${v} %`, hint: "Arabian Sea systems" },
  { key: "droughtPct", label: "Drought aggravation", min: -50, max: 50, step: 5, fmt: (v) => `${v > 0 ? "+" : ""}${v} %`, hint: "Marathwada rain-shadow" },
];

const PRESETS: { name: string; sub: string; params: SimParams }[] = [
  { name: "2025 Monsoon (Mumbai 26/7 style)", sub: "+65% rain · rivers +3 m", params: { rainfallPct: 65, riverRiseM: 3, quakeMag: 3, cyclonePct: 10, droughtPct: 0 } },
  { name: "Krishna flood 2019", sub: "+55% rain · rivers +4 m", params: { rainfallPct: 55, riverRiseM: 4, quakeMag: 3, cyclonePct: 0, droughtPct: 0 } },
  { name: "Killari 1993 quake", sub: "M 6.3 seismic event", params: { rainfallPct: 0, riverRiseM: 0, quakeMag: 6.3, cyclonePct: 0, droughtPct: 0 } },
  { name: "Rain-shadow drought (Marathwada)", sub: "+35% drought stress", params: { rainfallPct: 0, riverRiseM: 0, quakeMag: 3, cyclonePct: 0, droughtPct: 35 } },
];

export default function SimulationView() {
  const { data, sim, setSim, simActive, setSimActive } = useResQX();
  const [presetName, setPresetName] = useState<string | null>(null);

  // The engine's quake driver needs faultDistKm; the bootstrap DTO omits it (frozen contract),
  // so derive proximity to the Killari (1993) and Koyna-Warna seismic belts from real coordinates.
  const simHabitations = useMemo(() => {
    if (!data) return null;
    return data.habitations.map((h) => ({
      ...h,
      faultDistKm: Math.min(haversineKm(h, { lat: 18.0833, lng: 76.5333 }), haversineKm(h, { lat: 17.402, lng: 73.752 })),
    })) as Habitation[];
  }, [data]);

  const result = useMemo(() => (simHabitations ? runSimulation(simHabitations, sim) : null), [simHabitations, sim]);

  const setParam = (key: SimKey, v: number) => {
    setSim((s) => ({ ...s, [key]: v }));
    setPresetName(null);
  };

  const reset = () => {
    setSim(DEFAULT_SIM);
    setSimActive(false);
    setPresetName(null);
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setSim(p.params);
    setSimActive(true);
    setPresetName(p.name);
  };

  const newRedZones = useMemo(() => {
    if (!result) return [];
    return result.habitations
      .filter((h) => h.baseline.riskLevel !== "high" && h.riskLevel === "high")
      .sort((a, b) => b.hazardScore - a.hazardScore)
      .slice(0, 8);
  }, [result]);

  const s = result?.summary;
  const redIncreased = !!s && s.highAfter > s.highBefore;
  const popDelta = s ? s.popHighAfter - s.popHighBefore : 0;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="What-if Disaster Simulation"
        subtitle="Move the sliders — watch red zones expand live (client-side engine, zero latency)"
        icon={FlaskConical}
        actions={
          <>
            <button
              onClick={reset}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/5 px-4 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button
              onClick={() => setSimActive(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition-colors hover:bg-emerald-500"
            >
              <Play className="h-4 w-4" /> Run scenario
            </button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* LEFT — control panel */}
        <div className="space-y-4 lg:col-span-1">
          <div className="panel space-y-5 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-semibold">Scenario parameters</p>
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide",
                  simActive ? "border-red-500/45 bg-red-500/12 text-red-400" : "border-emerald-500/35 bg-emerald-500/10 text-emerald-400"
                )}
              >
                {simActive ? "SCENARIO LIVE" : "BASELINE"}
              </span>
            </div>

            {SLIDERS.map((sl) => (
              <div key={sl.key}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-medium text-foreground/90">{sl.label}</p>
                    <p className="text-[10px] text-muted-foreground">{sl.hint}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-bold tabular-nums",
                      sim && sim[sl.key] !== DEFAULT_SIM[sl.key]
                        ? "border-red-500/40 bg-red-500/10 text-red-300"
                        : "border-emerald-900/60 bg-emerald-950/40 text-emerald-300"
                    )}
                  >
                    {sl.fmt(sim[sl.key])}
                  </span>
                </div>
                <Slider
                  value={[sim[sl.key]]}
                  min={sl.min}
                  max={sl.max}
                  step={sl.step}
                  onValueChange={(vals) => setParam(sl.key, vals[0])}
                  aria-label={sl.label}
                />
              </div>
            ))}
          </div>

          <div className="panel p-4 sm:p-5">
            <p className="mb-3 font-display text-sm font-semibold">Historic scenario presets</p>
            <div className="space-y-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                    presetName === p.name
                      ? "border-emerald-400/60 bg-emerald-500/15"
                      : "border-emerald-900/60 bg-[#0a1210] hover:border-emerald-500/40 hover:bg-emerald-500/8"
                  )}
                >
                  <span>
                    <span className="block text-[13px] font-semibold text-foreground/90">{p.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{p.sub}</span>
                  </span>
                  <Play className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — recolored map */}
        <div className="panel overflow-hidden p-0 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900/50 px-4 py-3">
            <p className="font-display text-sm font-semibold">Live hazard recolor — Maharashtra</p>
            <p className="text-[11px] text-muted-foreground">
              {simActive ? "Red = composite ≥ 48 under scenario" : "Baseline composite scoring"}
            </p>
          </div>
          {simHabitations ? (
            <HazardMap
              habitations={simActive && result ? result.habitations : data?.habitations}
              showDistrictBlobs={false}
              height={420}
            />
          ) : (
            <div className="flex h-[420px] items-center justify-center text-xs text-muted-foreground">Loading map…</div>
          )}
        </div>
      </div>

      {/* Impact summary */}
      {s && (
        <div key={simActive ? "live" : "baseline"} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Red-zone habitations"
            value={s.highAfter}
            sub={redIncreased ? `was ${s.highBefore} — expanded` : `was ${s.highBefore} — unchanged`}
            icon={TrendingUp}
            tone={redIncreased ? "danger" : "success"}
          />
          <StatCard
            label="Population in red zones"
            value={fmtCompact(s.popHighAfter)}
            sub={`${popDelta >= 0 ? "+" : "−"}${fmtCompact(Math.abs(popDelta))} vs baseline`}
            icon={Users}
            tone={popDelta > 0 ? "danger" : "success"}
          />
          <StatCard
            label="Additional displacement"
            value={fmtCompact(s.displacement)}
            sub="persons newly exposure-weighted"
            icon={UserMinus}
            tone={s.displacement > 0 ? "danger" : "success"}
          />
          <StatCard
            label="Worst-hit district"
            value={s.worstDistrict}
            sub="largest composite score gain"
            icon={MapPinned}
            tone={s.displacement > 0 ? "warning" : "default"}
          />
        </div>
      )}

      {/* Top new red-zone entries */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="panel p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-sm font-semibold">Top new red-zone entries</p>
            <p className="text-[11px] text-muted-foreground">Habitations crossing composite ≥ 48 under this scenario</p>
          </div>
          {newRedZones.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No new red-zone entries — current scenario keeps every habitation below the threshold.
            </p>
          ) : (
            <ul className="max-h-[420px] space-y-1.5 overflow-y-auto thin-scrollbar pr-1">
              {newRedZones.map((h, i) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2.5 transition-colors hover:bg-red-500/10"
                >
                  <span className="w-6 shrink-0 font-display text-xs font-bold tabular-nums text-red-400">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-foreground/95">{h.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{h.district} · {h.taluka}</span>
                  </span>
                  <span className="rounded-md border border-emerald-900/60 bg-emerald-950/40 px-2 py-1 text-[11px] font-bold tabular-nums">
                    <span className="text-emerald-400">{h.baseline.hazardScore.toFixed(1)}</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="text-red-400">{h.hazardScore.toFixed(1)}</span>
                  </span>
                  <span className="w-20 text-right text-[11px] font-semibold tabular-nums text-foreground/80">{fmtIN(h.population)}</span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Scenario model: rainfall multiplies flood &amp; landslide drivers; river rise adds river-proximity-weighted flood load; quake magnitude scales
        Killari/Koyna fault proximity; live composite recomputed with production weights (flood 32% · landslide 22% · drought 16% · quake 16% · cyclone 14%).
      </p>
    </div>
  );
}
