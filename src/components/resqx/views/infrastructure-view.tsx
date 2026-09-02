"use client";
// ResQX — Infrastructure & Shelter Management (view: infrastructure)
// Builds strictly against frozen contracts: useResQX store, widgets, types.ts.
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BedDouble, Building2, ChevronRight, Dam, Droplets, Flame, HeartPulse, Hospital,
  Phone, Route, ShieldAlert, Siren, Tent, Waypoints, Wrench, Zap,
} from "lucide-react";
import { useResQX } from "../store";
import {
  EmptyState, ScoreBar, SectionHeader, SkeletonBlock, StatCard, fmtCompact, fmtIN,
} from "../widgets";
import type { InfraItem, InfraType, ReliefProject, Shelter } from "@/lib/types";

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

const SHELTER_TYPE: Record<Shelter["type"], string> = {
  school: "School",
  community_hall: "Community Hall",
  cyclone_shelter: "Cyclone Shelter",
  camp: "Relief Camp",
};

const SHELTER_STATUS: Record<Shelter["status"], { label: string; cls: string }> = {
  available: { label: "AVAILABLE", cls: "border-emerald-500/45 bg-emerald-500/10 text-emerald-400" },
  limited: { label: "LIMITED", cls: "border-yellow-500/45 bg-yellow-500/10 text-yellow-400" },
  full: { label: "FULL", cls: "border-red-500/45 bg-red-500/10 text-red-400" },
};

const INFRA_TYPE: Record<InfraType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  hospital: { label: "Hospital", icon: Hospital },
  fire_station: { label: "Fire Station", icon: Flame },
  ambulance: { label: "Ambulance", icon: Siren },
  water: { label: "Water", icon: Droplets },
  road: { label: "Road", icon: Route },
  bridge: { label: "Bridge", icon: Waypoints },
  dam: { label: "Dam", icon: Dam },
  power: { label: "Power", icon: Zap },
};

const INFRA_STATUS: Record<InfraItem["status"], { label: string; cls: string; color: string }> = {
  operational: { label: "OPERATIONAL", cls: "border-emerald-500/45 bg-emerald-500/10 text-emerald-400", color: "#10b981" },
  degraded: { label: "DEGRADED", cls: "border-yellow-500/45 bg-yellow-500/10 text-yellow-400", color: "#eab308" },
  at_risk: { label: "AT RISK", cls: "border-orange-500/45 bg-orange-500/10 text-orange-400", color: "#f97316" },
  damaged: { label: "DAMAGED", cls: "border-red-500/45 bg-red-500/10 text-red-400", color: "#ef4444" },
};

const PROJECT_STATUS: Record<ReliefProject["status"], { label: string; cls: string }> = {
  completed: { label: "COMPLETED", cls: "border-emerald-500/45 bg-emerald-500/10 text-emerald-400" },
  ongoing: { label: "ONGOING", cls: "border-amber-500/45 bg-amber-500/10 text-amber-400" },
  delayed: { label: "DELAYED", cls: "border-red-500/45 bg-red-500/10 text-red-400" },
  tendered: { label: "TENDERED", cls: "border-sky-500/45 bg-sky-500/10 text-sky-400" },
};

const PROJECT_CATEGORY: Record<ReliefProject["category"], string> = {
  compensation: "Compensation",
  housing: "Housing",
  infrastructure: "Infrastructure",
  livelihood: "Livelihood",
};

const auditDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

// ---------- view ----------

export default function InfrastructureView() {
  const { data, loading, error, refresh, focusOn } = useResQX();

  const { shelters, infrastructure, reliefProjects } = useMemo(
    () => ({
      shelters: data?.shelters ?? [],
      infrastructure: data?.infrastructure ?? [],
      reliefProjects: data?.reliefProjects ?? [],
    }),
    [data]
  );

  const kpi = useMemo(() => {
    const capacity = shelters.reduce((s, x) => s + x.capacity, 0);
    const occupancy = shelters.reduce((s, x) => s + x.occupancy, 0);
    const occPct = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0;
    const hospitals = infrastructure.filter((i) => i.type === "hospital").length;
    const critical = infrastructure.filter((i) => i.status === "at_risk" || i.status === "damaged").length;
    return { capacity, occPct, hospitals, critical };
  }, [shelters, infrastructure]);

  const tiles = useMemo(() => {
    const by = (types: InfraType[]) => infrastructure.filter((i) => types.includes(i.type));
    const mk = (label: string, icon: React.ComponentType<{ className?: string }>, items: InfraItem[]) => {
      const degraded = items.filter((i) => i.status === "degraded").length;
      const damaged = items.filter((i) => i.status === "damaged" || i.status === "at_risk").length;
      return { label, icon, count: items.length, degraded, damaged };
    };
    return [
      mk("Hospitals", Hospital, by(["hospital"])),
      mk("Bridges", Waypoints, by(["bridge"])),
      mk("Dams", Dam, by(["dam"])),
      mk("Roads", Route, by(["road"])),
      mk("Water", Droplets, by(["water"])),
      mk("Fire / Power", Flame, by(["fire_station", "power"])),
    ];
  }, [infrastructure]);

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <SkeletonBlock className="h-14" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20" />
          ))}
        </div>
        <SkeletonBlock className="h-80" />
        <SkeletonBlock className="h-72" />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <SectionHeader
          title="Infrastructure & Shelter Management"
          subtitle="Hospitals, bridges, dams & relief shelters — operational readiness"
          icon={Building2}
        />
        <div className="panel flex flex-col items-center gap-4 p-8">
          <EmptyState icon={Building2} title="Asset registry unavailable" hint={error ?? "Could not reach the ResQX control plane."} />
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
        title="Infrastructure & Shelter Management"
        subtitle="Hospitals, bridges, dams & relief shelters — operational readiness"
        icon={Building2}
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Relief Shelters" value={shelters.length} sub="Schools · halls · cyclone shelters · camps" icon={Tent} tone="default" delay={0} />
        <StatCard label="Shelter Capacity" value={fmtIN(kpi.capacity)} sub={`Occupancy ${kpi.occPct}% of installed beds`} icon={BedDouble} tone="success" delay={0.03} />
        <StatCard label="Health Facilities" value={kpi.hospitals} sub="Hospitals in the response network" icon={HeartPulse} tone="default" delay={0.06} />
        <StatCard label="Assets Critical" value={kpi.critical} sub="At-risk or damaged — audit due" icon={ShieldAlert} tone="danger" delay={0.09} />
      </div>

      {/* status tiles */}
      <Reveal delay={0.12}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map((t) => (
            <div key={t.label} className="panel panel-hover p-3">
              <div className="flex items-center gap-1.5">
                <t.icon className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.label}</p>
              </div>
              <p className="mt-1 font-display text-xl font-bold tabular-nums">{t.count}</p>
              <p className="mt-0.5 text-[10px] font-medium whitespace-nowrap">
                {t.degraded === 0 && t.damaged === 0 ? (
                  <span className="text-emerald-400">All operational</span>
                ) : (
                  <>
                    {t.degraded > 0 && <span className="text-orange-400">{t.degraded} degraded</span>}
                    {t.degraded > 0 && t.damaged > 0 && <span className="text-muted-foreground"> · </span>}
                    {t.damaged > 0 && <span className="text-red-400">{t.damaged} critical</span>}
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* shelter network */}
      <Reveal delay={0.15}>
        <div className="panel panel-hover p-4 sm:p-5">
          <PanelHead
            title="Shelter Network"
            sub="Click a shelter to locate it on the risk map"
            right={
              <span className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                {shelters.length} sites
              </span>
            }
          />
          <div className="thin-scrollbar max-h-[520px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shelters.map((s, i) => {
                const pct = s.capacity > 0 ? (s.occupancy / s.capacity) * 100 : 0;
                const barColor = pct < 60 ? "#10b981" : pct < 85 ? "#eab308" : "#ef4444";
                const st = SHELTER_STATUS[s.status];
                return (
                  <motion.button
                    key={s.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.03 * i }}
                    onClick={() => focusOn(s.lat, s.lng, 10)}
                    className="group flex h-full flex-col rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3 text-left transition-colors hover:border-emerald-500/35 hover:bg-emerald-500/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-foreground">{s.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{s.district}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-emerald-700 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-400" />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md border border-emerald-900/50 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80">
                        {SHELTER_TYPE[s.type]}
                      </span>
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${st.cls}`}>{st.label}</span>
                    </div>

                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="font-display text-xl font-bold tabular-nums">{fmtIN(s.capacity)}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">person capacity</span>
                    </div>

                    <ScoreBar
                      value={pct}
                      color={barColor}
                      label="Occupancy"
                      right={`${fmtIN(s.occupancy)}/${fmtIN(s.capacity)}`}
                      className="mt-2"
                    />

                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.facilities.slice(0, 3).map((f) => (
                        <span key={f} className="rounded border border-emerald-900/50 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] text-foreground/75">
                          {f}
                        </span>
                      ))}
                      {s.facilities.length > 3 && (
                        <span className="rounded border border-emerald-900/50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                          +{s.facilities.length - 3}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0" /> {s.contact}
                    </p>
                  </motion.button>
                );
              })}
            </div>
            {shelters.length === 0 && <EmptyState icon={Tent} title="No shelters registered" hint="Shelter registry is empty." />}
          </div>
        </div>
      </Reveal>

      {/* critical infrastructure status */}
      <Reveal delay={0.18}>
        <div className="panel panel-hover p-4 sm:p-5">
          <PanelHead
            title="Critical Infrastructure Status"
            sub="Condition scores from the latest field audits"
            right={
              <span className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                {infrastructure.length} assets
              </span>
            }
          />
          <div className="thin-scrollbar max-h-[420px] overflow-auto pr-1">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="sticky top-0 z-10 bg-[#0c1411] text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-2.5 font-semibold">Name</th>
                  <th className="px-2 py-2.5 font-semibold">Type</th>
                  <th className="px-2 py-2.5 font-semibold">District</th>
                  <th className="px-2 py-2.5 font-semibold w-36">Condition</th>
                  <th className="px-2 py-2.5 font-semibold">Status</th>
                  <th className="px-2 py-2.5 font-semibold whitespace-nowrap">Last audit</th>
                  <th className="px-2 py-2.5 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {infrastructure.map((it) => {
                  const meta = INFRA_TYPE[it.type];
                  const st = INFRA_STATUS[it.status];
                  const Icon = meta.icon;
                  return (
                    <tr key={it.id} className="border-t border-emerald-900/40 text-xs transition-colors hover:bg-emerald-500/5">
                      <td className="px-2 py-2.5 font-semibold text-foreground">{it.name}</td>
                      <td className="px-2 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-foreground/80">
                          <Icon className="h-3.5 w-3.5 text-emerald-500/80" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-muted-foreground">{it.district}</td>
                      <td className="px-2 py-2.5">
                        <ScoreBar value={it.conditionScore} color={st.color} />
                      </td>
                      <td className="px-2 py-2.5">
                        <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-[11px] text-muted-foreground tabular-nums">
                        {auditDate(it.lastAudit)}
                      </td>
                      <td className="px-2 py-2.5">
                        <span className="block w-40 truncate text-[11px] text-muted-foreground" title={it.note}>
                          {it.note}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {infrastructure.length === 0 && <EmptyState icon={Wrench} title="No assets registered" hint="Infrastructure registry is empty." />}
          </div>
        </div>
      </Reveal>

      {/* relief & rehabilitation tracker */}
      <Reveal delay={0.21}>
        <div className="panel panel-hover p-4 sm:p-5">
          <PanelHead
            title="Relief & Rehabilitation Tracker"
            sub="SDRF / NDRF / state-plan projects — sanctions vs utilisation"
            right={
              <span className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                {reliefProjects.length} projects
              </span>
            }
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {reliefProjects.map((p, i) => {
              const spentPct = p.budgetCr > 0 ? (p.spentCr / p.budgetCr) * 100 : 0;
              const st = PROJECT_STATUS[p.status];
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.03 * i }}
                  className="flex h-full flex-col rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-[13px] font-semibold leading-snug text-foreground">{p.name}</p>
                    <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md border border-emerald-900/50 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80">
                      {PROJECT_CATEGORY[p.category]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{p.district}</span>
                  </div>

                  <div className="mt-2.5 flex items-baseline gap-1.5">
                    <span className="font-display text-lg font-bold tabular-nums">₹{fmtIN(p.budgetCr)} Cr</span>
                  </div>
                  <ScoreBar value={spentPct} color="#10b981" label="Spent" right={`₹${fmtIN(p.spentCr)} Cr`} className="mt-1.5" />

                  <div className="mt-3 flex items-end justify-between gap-2 border-t border-emerald-900/40 pt-2.5">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Beneficiaries</p>
                      <p className="font-display text-sm font-bold tabular-nums">{fmtCompact(p.beneficiaries)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Progress</p>
                      <p className="font-display text-sm font-bold text-emerald-400 tabular-nums">{p.progressPct}%</p>
                    </div>
                  </div>
                  <ScoreBar value={p.progressPct} max={100} color="#10b981" className="mt-1.5" />

                  <p className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground">
                    {p.agency} · {p.timeline}
                  </p>
                </motion.div>
              );
            })}
          </div>
          {reliefProjects.length === 0 && <EmptyState icon={Wrench} title="No projects tracked" hint="Relief project registry is empty." />}
        </div>
      </Reveal>
    </div>
  );
}
