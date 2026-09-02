"use client";
// ResQX — Insurance & Protection Guidance (view: protection)
// Builds strictly against frozen contracts: useResQX store, widgets, static-data.ts.
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, ChevronRight, ClipboardCheck, MapPin, Mountain, ShieldCheck, Sun, Waves, Wind,
} from "lucide-react";
import { useResQX } from "../store";
import {
  EmptyState, ScoreBar, SectionHeader, SkeletonBlock, fmtCompact,
} from "../widgets";
import { INSURANCE_PRODUCTS } from "@/lib/static-data";

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

// large hero bar (ScoreBar is fixed h-1.5 — hero needs a thicker gauge)
function BigBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-3 w-full rounded-full bg-emerald-950/60 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

const protColor = (v: number) => (v >= 50 ? "#10b981" : v >= 30 ? "#eab308" : "#ef4444");

const BREAKDOWN = [
  { label: "PMFBY enrolment", value: 62 },
  { label: "PMSBY penetration", value: 41 },
  { label: "PMJJBY penetration", value: 28 },
  { label: "House insurance", value: 12 },
];

const ACTIONS = [
  "Enrol all adults in PMSBY (₹20/year) via bank / CSC",
  "Farmers — enrol in PMFBY before the kharif cut-off",
  "Add earthquake rider on house policy in Zone III / IV (Killari–Koyna belt)",
  "Livestock owners — state-subsidised cattle insurance (50% premium support)",
  "Verify nominee details & Aadhaar-seeded bank account for DBT",
];

const HAZARD_COVER: { hazard: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; cover: string }[] = [
  {
    hazard: "Flood",
    icon: Waves,
    color: "#38bdf8",
    cover: "PMFBY crop cover · Bharat Griha Raksha house policy (flood) · PMSBY accident cover",
  },
  {
    hazard: "Earthquake",
    icon: Mountain,
    color: "#fb923c",
    cover: "House policy + earthquake rider (Zone III/IV) · PMJJBY term life for breadwinners",
  },
  {
    hazard: "Cyclone",
    icon: Wind,
    color: "#c084fc",
    cover: "Structure + contents house cover · Shop & livelihood interruption cover · Cyclone-shelter registration",
  },
  {
    hazard: "Drought",
    icon: Sun,
    color: "#fbbf24",
    cover: "PMFBY (drought perils) · Magel Tyala Shettale farm-pond subsidy · PM-KISAN income support",
  },
  {
    hazard: "Landslide",
    icon: AlertTriangle,
    color: "#a3e635",
    cover: "PMFBY landslide perils · House cover incl. landslide · PMSBY for ghat-road accidents",
  },
];

// ---------- view ----------

export default function ProtectionView() {
  const { data, loading, error, refresh, setView, focusOn } = useResQX();

  const habitations = useMemo(() => data?.habitations ?? [], [data]);

  const score = useMemo(() => {
    if (habitations.length === 0) return 0;
    return Math.round(habitations.reduce((s, h) => s + h.protectionScore, 0) / habitations.length);
  }, [habitations]);

  const lowest = useMemo(
    () => habitations.slice().sort((a, b) => a.protectionScore - b.protectionScore).slice(0, 8),
    [habitations]
  );

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <SkeletonBlock className="h-14" />
        <SkeletonBlock className="h-64" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-40" />
          ))}
        </div>
        <SkeletonBlock className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <SectionHeader
          title="Insurance & Protection"
          subtitle="Affordable protection for every household in hazard-prone habitations"
          icon={ShieldCheck}
        />
        <div className="panel flex flex-col items-center gap-4 p-8">
          <EmptyState icon={ShieldCheck} title="Protection data unavailable" hint={error ?? "Could not reach the ResQX control plane."} />
          <button
            onClick={() => refresh()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
          >
            Retry connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Insurance & Protection"
        subtitle="Affordable protection for every household in hazard-prone habitations"
        icon={ShieldCheck}
      />

      {/* hero: protection score + recommended actions */}
      <Reveal delay={0.05}>
        <div className="panel panel-hover grid grid-cols-1 gap-5 p-4 sm:p-5 lg:grid-cols-2 lg:gap-6">
          {/* LEFT — platform protection score */}
          <div>
            <PanelHead title="Platform Protection Score" sub="Mean insurance & awareness coverage across surveyed habitations" />
            <div className="flex items-end gap-3">
              <p className="font-display text-5xl font-bold leading-none text-emerald-400 tabular-nums">{score}%</p>
              <p className="pb-1 text-[11px] text-muted-foreground">of households financially protected against disasters</p>
            </div>
            <BigBar value={score} color={protColor(score)} />

            <div className="mt-4 space-y-3 border-t border-emerald-900/40 pt-3.5">
              {BREAKDOWN.map((b) => (
                <ScoreBar
                  key={b.label}
                  value={b.value}
                  color={protColor(b.value)}
                  label={`${b.label} (est.)`}
                  right={`${b.value}%`}
                />
              ))}
            </div>
            <p className="mt-2.5 text-[10px] text-muted-foreground">
              Breakdown figures are static planning estimates — replace with insurer MIS feeds in production.
            </p>
          </div>

          {/* RIGHT — recommended actions */}
          <div className="lg:border-l lg:border-emerald-900/40 lg:pl-6">
            <PanelHead title="Recommended actions" sub="Highest-impact protection moves for field officers" />
            <ol className="space-y-2.5">
              {ACTIONS.map((a, i) => (
                <li key={a} className="flex items-start gap-3 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 font-display text-[11px] font-bold text-emerald-300 tabular-nums">
                    {i + 1}
                  </span>
                  <p className="text-xs leading-relaxed text-foreground/90">{a}</p>
                </li>
              ))}
            </ol>
            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              Track enrolment drives in the district action plan; report coverage gaps via Field Reports.
            </p>
          </div>
        </div>
      </Reveal>

      {/* protection products */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {INSURANCE_PRODUCTS.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.03 * i }}
            className="panel panel-hover flex h-full flex-col p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-semibold leading-snug text-foreground">{p.name}</p>
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500/70" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                {p.premium}
              </span>
              <span className="rounded-md border border-emerald-900/50 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80">
                Cover: {p.cover}
              </span>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground/80">Covers: </span>
              {p.covers}
            </p>
            <p className="mt-auto border-t border-emerald-900/40 pt-2 text-[10px] text-muted-foreground">{p.provider}</p>
          </motion.div>
        ))}
      </div>

      {/* hazard-cover matrix + lowest-protection habitations */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Reveal delay={0.1}>
          <div className="panel panel-hover h-full p-4 sm:p-5">
            <PanelHead title="Which cover for which hazard?" sub="Match the dominant peril to the right product" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 font-semibold">Hazard</th>
                    <th className="px-2 py-2 font-semibold">Recommended products</th>
                  </tr>
                </thead>
                <tbody>
                  {HAZARD_COVER.map((r) => (
                    <tr key={r.hazard} className="border-t border-emerald-900/40 align-top transition-colors hover:bg-emerald-500/5">
                      <td className="px-2 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <r.icon className="h-3.5 w-3.5 shrink-0" style={{ color: r.color }} />
                          {r.hazard}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-xs leading-relaxed text-muted-foreground">{r.cover}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.13}>
          <div className="panel panel-hover flex h-full flex-col p-4 sm:p-5">
            <PanelHead
              title="Lowest-protection habitations"
              sub="Weakest insurance & awareness coverage — prioritise enrolment drives"
              right={
                <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-400">
                  BOTTOM 8
                </span>
              }
            />
            <div className="thin-scrollbar max-h-[420px] flex-1 space-y-1 overflow-y-auto pr-1">
              {lowest.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    focusOn(h.lat, h.lng, 10);
                    setView("map");
                  }}
                  className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2.5 text-left transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold text-foreground">{h.name}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        {fmtCompact(h.population)} people
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{h.district} · {h.taluka}</p>
                    <ScoreBar
                      value={h.protectionScore}
                      color={h.protectionScore < 40 ? "#ef4444" : undefined}
                      right={`${Math.round(h.protectionScore)}%`}
                      className="mt-1.5"
                    />
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-emerald-700 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-400" />
                </button>
              ))}
              {lowest.length === 0 && (
                <EmptyState icon={MapPin} title="No habitation data" hint="Protection scores appear once habitations load." />
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
