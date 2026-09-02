"use client";
// ResQX — Real-time Alerts & Early Warning (view: alerts)
// Builds strictly against frozen contracts: useResQX store, widgets, types.ts, static-data.ts.
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, BellRing, ChevronDown, Droplets, MapPin, Mountain,
  Radio, Siren, Volume2, Waves,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useResQX } from "../store";
import {
  EmptyState, LiveDot, ScoreBar, SectionHeader, SkeletonBlock, StatCard, timeAgo,
} from "../widgets";
import type { AlertItem, AlertSeverity, HazardKey } from "@/lib/types";
import { HAZARD_META } from "@/lib/static-data";

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
} as const;

const SEV_COLOR: Record<AlertSeverity, string> = {
  critical: "#ef4444",
  warning: "#f97316",
  advisory: "#eab308",
  watch: "#38bdf8",
};

const SEV_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, advisory: 2, watch: 3 };

const SEV_CHIP: Record<AlertSeverity, string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-400",
  warning: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  advisory: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  watch: "border-sky-500/40 bg-sky-500/10 text-sky-400",
};

const HAZARD_COLOR: Record<HazardKey, string> = HAZARD_META.reduce(
  (acc, m) => ({ ...acc, [m.key]: m.color }),
  {} as Record<HazardKey, string>
);

const hazardLabel = (h: HazardKey) => HAZARD_META.find((m) => m.key === h)?.label.replace(" Hazard", "") ?? h;

// ---------- view ----------

export default function AlertsView() {
  const { data, loading, error, refresh, setView, focusOn } = useResQX();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const alerts = useMemo(
    () =>
      (data?.alerts ?? []).slice().sort(
        (a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || +new Date(b.issuedAt) - +new Date(a.issuedAt)
      ),
    [data]
  );

  // early-warning indicator values derived from live alerts
  const ind = useMemo(() => {
    const anyCritical = alerts.some((a) => a.severity === "critical");
    const anyWarning = alerts.some((a) => a.severity === "warning");
    const anyAdvisory = alerts.some((a) => a.severity === "advisory");
    const floodSevere = alerts.some((a) => a.hazard === "flood" && (a.severity === "critical" || a.severity === "warning"));
    const floodAny = alerts.some((a) => a.hazard === "flood");
    const landslideAny = alerts.some((a) => a.hazard === "landslide");

    const rainfall = floodSevere ? 78 : 45;
    const river = floodAny ? 74 : 40;
    const slope = landslideAny ? 82 : 35; // INVERTED — shown as instability / saturation, higher = worse
    const threat = Math.max(35, anyCritical ? 85 : anyWarning ? 70 : anyAdvisory ? 50 : 35);

    const threatChip =
      threat >= 85
        ? { label: "HIGH", cls: "border-red-500/45 bg-red-500/10 text-red-400" }
        : threat >= 70
          ? { label: "ELEVATED", cls: "border-orange-500/45 bg-orange-500/10 text-orange-400" }
          : { label: "MODERATE", cls: "border-yellow-500/45 bg-yellow-500/10 text-yellow-400" };

    return { rainfall, river, slope, threat, threatChip };
  }, [alerts]);

  const mix = useMemo(() => {
    const counts = new Map<HazardKey, number>();
    for (const a of alerts) counts.set(a.hazard, (counts.get(a.hazard) ?? 0) + 1);
    return Array.from(counts.entries()).map(([key, value]) => ({
      key,
      name: hazardLabel(key),
      value,
      fill: HAZARD_COLOR[key] ?? "#10b981",
    }));
  }, [alerts]);

  const stats = useMemo(() => {
    const critical = alerts.filter((a) => a.severity === "critical").length;
    const warnings = alerts.filter((a) => a.severity === "warning").length;
    const soft = alerts.filter((a) => a.severity === "advisory" || a.severity === "watch").length;
    const districts = new Set(alerts.map((a) => a.district)).size;
    return { critical, warnings, soft, districts };
  }, [alerts]);

  const speak = (a: AlertItem) => {
    try {
      const u = new SpeechSynthesisUtterance(`${a.title}. ${a.message}. ${a.instructions}`);
      u.lang = "en-IN";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      /* speech synthesis unavailable */
    }
  };

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <SkeletonBlock className="h-14" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24" />
          ))}
        </div>
        <SkeletonBlock className="h-40" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <SkeletonBlock className="h-96 lg:col-span-2" />
          <SkeletonBlock className="h-96" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <SectionHeader
          title="Real-time Alerts & Early Warning"
          subtitle="Live feeds — IMD · CWC · GSDMA · District Control Rooms"
          icon={BellRing}
        />
        <div className="panel flex flex-col items-center gap-4 p-8">
          <EmptyState icon={BellRing} title="Alert feed unavailable" hint={error ?? "Could not reach the ResQX control plane."} />
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

  const indicators = [
    {
      icon: Droplets,
      label: "IMD rainfall anomaly",
      value: ind.rainfall,
      color: ind.rainfall >= 70 ? "#ef4444" : "#f97316",
      status: ind.rainfall >= 70 ? "Above threshold — heavy rainfall spell" : "Within seasonal norms",
      statusCls: ind.rainfall >= 70 ? "text-red-400" : "text-emerald-400",
    },
    {
      icon: Waves,
      label: "CWC gauge status",
      value: ind.river,
      color: ind.river >= 70 ? "#ef4444" : "#f97316",
      status: ind.river >= 70 ? "Rivers rising near danger mark" : "Gauges below warning level",
      statusCls: ind.river >= 70 ? "text-red-400" : "text-emerald-400",
    },
    {
      icon: Mountain,
      label: "Ghat slope saturation",
      value: ind.slope,
      color: ind.slope >= 70 ? "#ef4444" : "#10b981",
      status: ind.slope >= 70 ? "Slope instability HIGH — ghat watch" : "Slope instability LOW — stable",
      statusCls: ind.slope >= 70 ? "text-red-400" : "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Real-time Alerts & Early Warning"
        subtitle="Live feeds — IMD · CWC · GSDMA · District Control Rooms"
        icon={BellRing}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold tracking-widest text-red-400">
            <LiveDot tone="red" /> LIVE FEED
          </span>
        }
      />

      {/* summary strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Critical Alerts" value={stats.critical} sub="Immediate action required" icon={AlertTriangle} tone="danger" delay={0} />
        <StatCard label="Active Warnings" value={stats.warnings} sub="District control rooms notified" icon={Siren} tone="warning" delay={0.03} />
        <StatCard label="Advisories & Watches" value={stats.soft} sub="Keep 3-hour monitoring cycle" icon={Radio} tone="default" delay={0.06} />
        <StatCard label="Districts Affected" value={stats.districts} sub="Across monitored basins" icon={MapPin} tone="info" delay={0.09} />
      </div>

      {/* early warning indicators */}
      <Reveal delay={0.12}>
        <div className="panel panel-hover p-4 sm:p-5">
          <PanelHead title="Early Warning Indicators" sub="Derived live from active bulletins — higher bar = higher risk" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {indicators.map((t) => (
              <div key={t.label} className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
                <div className="flex items-center gap-2">
                  <t.icon className="h-4 w-4 shrink-0 text-emerald-400" />
                  <p className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.label}
                  </p>
                </div>
                <ScoreBar value={t.value} color={t.color} className="mt-2.5" />
                <p className={`mt-2 text-[11px] font-medium ${t.statusCls}`}>{t.status}</p>
              </div>
            ))}
            <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 shrink-0 text-emerald-400" />
                <p className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Composite threat
                </p>
              </div>
              <ScoreBar value={ind.threat} color={ind.threat >= 85 ? "#ef4444" : ind.threat >= 70 ? "#f97316" : "#eab308"} className="mt-2.5" />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${ind.threatChip.cls}`}
                >
                  {ind.threatChip.label}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">{ind.threat}/100</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* feed + mix */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* alert feed */}
        <div className="space-y-3 lg:col-span-2">
          {alerts.map((a, i) => {
            const open = !!expanded[a.id];
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.03 * i }}
                className="panel panel-hover overflow-hidden p-0"
              >
                <div className="flex">
                  <div className="w-1 shrink-0" style={{ background: SEV_COLOR[a.severity] }} />
                  <div className="min-w-0 flex-1 p-4">
                    {/* meta row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${SEV_CHIP[a.severity]}`}
                      >
                        {a.severity}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-900/50 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: HAZARD_COLOR[a.hazard] }} />
                        {hazardLabel(a.hazard)}
                      </span>
                      <span className="inline-flex rounded-md border border-emerald-900/50 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80">
                        {a.district}
                      </span>
                      <span className="ml-auto whitespace-nowrap text-[10px] text-muted-foreground">
                        {a.source} · {timeAgo(a.issuedAt)}
                      </span>
                    </div>

                    <h4 className="mt-2 font-display text-sm font-semibold text-foreground">{a.title}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">{a.message}</p>

                    {/* expandable safety instructions */}
                    <button
                      onClick={() => toggle(a.id)}
                      aria-expanded={open}
                      className="mt-2 inline-flex min-h-[44px] w-full items-center gap-1.5 rounded-lg px-1 text-[11px] font-semibold text-emerald-300 transition-colors hover:text-emerald-200"
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                      Safety instructions
                    </button>
                    {open && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
                          <p className="text-xs leading-relaxed text-amber-200/90">{a.instructions}</p>
                          <p className="mt-1.5 text-[10px] text-muted-foreground">
                            Valid until {new Date(a.validUntil).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* footer actions */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.lat != null && a.lng != null && (
                        <button
                          onClick={() => {
                            focusOn(a.lat as number, a.lng as number, 9);
                            setView("map");
                          }}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
                        >
                          <MapPin className="h-3.5 w-3.5" /> Locate on map
                        </button>
                      )}
                      <button
                        onClick={() => speak(a)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
                      >
                        <Volume2 className="h-3.5 w-3.5" /> Read aloud
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {alerts.length === 0 && (
            <div className="panel">
              <EmptyState icon={BellRing} title="No alerts on the feed" hint="All monitored districts are currently all-clear." />
            </div>
          )}
        </div>

        {/* side panel — alert mix */}
        <Reveal delay={0.15}>
          <div className="panel panel-hover h-full p-4 sm:p-5">
            <PanelHead
              title="Alert Mix"
              sub="Active bulletins by hazard type"
              right={
                <span className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                  {alerts.length} alerts
                </span>
              }
            />
            {mix.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Tooltip {...TOOLTIP} formatter={(v: unknown, n: unknown) => [`${v} alert${Number(v) === 1 ? "" : "s"}`, String(n)]} />
                    <Pie data={mix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3} cornerRadius={4} stroke="#0a1210" strokeWidth={2}>
                      {mix.map((m) => (
                        <Cell key={m.key} fill={m.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {mix.map((m) => (
                    <div key={m.key} className="flex items-center gap-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-2.5 py-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: m.fill }} />
                      <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/85">{m.name}</span>
                      <span className="text-[11px] font-semibold tabular-nums">{m.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={BellRing} title="Nothing to plot" hint="Alert mix appears as bulletins arrive." />
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
