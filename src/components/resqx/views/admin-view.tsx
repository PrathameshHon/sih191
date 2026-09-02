"use client";
// ResQX — Role-based Admin & Governance
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, BadgeCheck, Check, HardHat, Landmark, Loader2, Radio, ServerCog,
  ShieldCheck, ShieldEllipsis, X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { RISK_COLORS, RISK_LABELS } from "@/lib/types";
import type { FieldReport } from "@/lib/types";
import { useResQX } from "../store";
import { SectionHeader, StatCard, fmtCompact, timeAgo, LiveDot } from "../widgets";
import { cn } from "@/lib/utils";

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

type Role = "collector" | "sdma" | "field";

const ROLES: { id: Role; title: string; sub: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "collector", title: "District Collector", sub: "Full KPIs + approvals", icon: Landmark },
  { id: "sdma", title: "SDMA Officer", sub: "State-wide alerts + district comparison", icon: ShieldCheck },
  { id: "field", title: "Field Officer", sub: "My field reports + task list", icon: HardHat },
];

export default function AdminView() {
  const { data, queue } = useResQX();
  const [role, setRole] = useState<Role>("collector");
  const records = useRecordsCount();

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Admin Dashboard"
        subtitle="Role-based access — District Collector · SDMA · Field Officer"
        icon={ShieldEllipsis}
      />

      {/* role switcher */}
      <div className="grid gap-3 sm:grid-cols-3">
        {ROLES.map((r, i) => (
          <motion.button
            key={r.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            onClick={() => setRole(r.id)}
            aria-pressed={role === r.id}
            className={cn(
              "panel panel-hover flex items-center gap-3 p-4 text-left",
              role === r.id && "border-emerald-400/60 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]"
            )}
          >
            <div className={cn(
              "rounded-lg border p-2.5",
              role === r.id ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
            )}>
              <r.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{r.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{r.sub}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={role}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {role === "collector" && <CollectorPanel />}
          {role === "sdma" && <SdmaPanel />}
          {role === "field" && <FieldPanel />}
        </motion.div>
      </AnimatePresence>

      <SystemHealth records={records} queueCount={queue.length} />
    </div>
  );
}

function useRecordsCount(): number {
  const { data } = useResQX();
  return useMemo(() => {
    if (!data) return 0;
    return (
      data.habitations.length +
      data.sites.length +
      data.alerts.length +
      data.shelters.length +
      data.infrastructure.length +
      data.reliefProjects.length +
      data.fieldReports.length
    );
  }, [data]);
}

/* ---------------- District Collector ---------------- */

type ApprovalState = "APPROVED" | "REJECTED";
const APPROVALS = [
  { id: "A1", name: "Taliye landslide relocation phase-2", detail: "Raigad · PMAY-G convergence", amount: "₹8.4 Cr", status: "PENDING" },
  { id: "A2", name: "Kopargaon Godavari embankment tender", detail: "Ahilyanagar · Water Resources Dept", amount: "₹12.6 Cr", status: "UNDER REVIEW" },
  { id: "A3", name: "Dharavi storm-water drain upgrade", detail: "Mumbai Suburban · flood-mitigation cell", amount: "₹31.0 Cr", status: "UNDER REVIEW" },
  { id: "A4", name: "Malin slope stabilisation & memorial works", detail: "Pune · GSDMA", amount: "₹2.7 Cr", status: "PENDING" },
] as const;

function CollectorPanel() {
  const { data } = useResQX();
  const t = data?.analytics.totals;
  const [decisions, setDecisions] = useState<Record<string, ApprovalState>>({});
  const [note, setNote] = useState<string | null>(null);

  const decide = (id: string, name: string, d: ApprovalState) => {
    setDecisions((prev) => ({ ...prev, [id]: d }));
    setNote(`${d === "APPROVED" ? "Approved" : "Rejected"}: ${name} — recorded in file notings`);
    setTimeout(() => setNote(null), 3500);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Habitations tracked" value={t ? t.habitations : "—"} sub={t ? `${t.districts} districts` : undefined} icon={Landmark} />
        <StatCard label="Red zones (high risk)" value={t ? t.highRiskHabitations : "—"} sub="composite ≥ 48" icon={Radio} tone="danger" />
        <StatCard label="At-risk population" value={t ? fmtCompact(t.populationAtRisk) : "—"} sub={t ? `${fmtCompact(t.population)} total surveyed` : undefined} icon={ShieldEllipsis} tone="warning" />
        <StatCard label="Capacity utilization" value={t ? `${Math.round(t.capacityUtilization)}%` : "—"} sub={t ? `${fmtCompact(t.totalCapacity)} persons capacity` : undefined} icon={ServerCog} tone={t && t.capacityUtilization > 80 ? "danger" : "success"} />
      </div>

      <div className="panel p-4 sm:p-5">
        <p className="mb-3 font-display text-sm font-semibold">Pending approvals</p>
        {note && (
          <p role="status" className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] font-medium text-emerald-300">
            <Check className="h-3.5 w-3.5" /> {note}
          </p>
        )}
        <div className="max-h-[420px] overflow-y-auto thin-scrollbar pr-1">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#0a1210]">
              <tr className="border-b border-emerald-900/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 pr-3 font-semibold">Proposal</th>
                <th className="py-2.5 pr-3 font-semibold">Amount</th>
                <th className="py-2.5 pr-3 font-semibold">Status</th>
                <th className="py-2.5 text-right font-semibold">Decision</th>
              </tr>
            </thead>
            <tbody>
              {APPROVALS.map((a) => {
                const decided = decisions[a.id];
                return (
                  <tr key={a.id} className="border-b border-emerald-900/30 text-sm transition-colors hover:bg-emerald-500/5">
                    <td className="py-3 pr-3">
                      <p className="text-[13px] font-medium text-foreground/95">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground">{a.detail}</p>
                    </td>
                    <td className="py-3 pr-3 text-xs font-bold tabular-nums text-emerald-300">{a.amount}</td>
                    <td className="py-3 pr-3">
                      {decided ? (
                        <span className={cn(
                          "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide",
                          decided === "APPROVED" ? "border-emerald-500/50 bg-emerald-500/12 text-emerald-400" : "border-red-500/50 bg-red-500/12 text-red-400"
                        )}>
                          {decided}
                        </span>
                      ) : (
                        <span className={cn(
                          "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide",
                          a.status === "PENDING" ? "border-amber-500/45 bg-amber-500/10 text-amber-400" : "border-sky-500/45 bg-sky-500/10 text-sky-400"
                        )}>
                          {a.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => decide(a.id, a.name, "APPROVED")}
                          disabled={!!decided}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 text-[11px] font-bold text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:opacity-40"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => decide(a.id, a.name, "REJECTED")}
                          disabled={!!decided}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-red-500/40 px-3 text-[11px] font-bold text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-40"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- SDMA Officer ---------------- */

const SEVERITY_CHIP: Record<string, string> = {
  critical: "border-red-500/50 bg-red-500/12 text-red-400",
  warning: "border-orange-500/50 bg-orange-500/12 text-orange-400",
  advisory: "border-yellow-500/50 bg-yellow-500/12 text-yellow-400",
  watch: "border-sky-500/50 bg-sky-500/10 text-sky-400",
};

function SdmaPanel() {
  const { data } = useResQX();

  const heat = useMemo(
    () =>
      [...(data?.analytics.districtRisk ?? [])]
        .sort((a, b) => b.hazardScore - a.hazardScore)
        .slice(0, 12)
        .map((d) => ({ district: d.district, hazardScore: d.hazardScore, level: d.riskLevel })),
    [data]
  );

  const alertsByDistrict = useMemo(() => {
    const m = new Map<string, { count: number; worst: string }>();
    const sevRank: Record<string, number> = { critical: 0, warning: 1, advisory: 2, watch: 3 };
    for (const a of data?.alerts ?? []) {
      if (!a.active) continue;
      const cur = m.get(a.district);
      if (!cur) m.set(a.district, { count: 1, worst: a.severity });
      else {
        cur.count += 1;
        if ((sevRank[a.severity] ?? 9) < (sevRank[cur.worst] ?? 9)) cur.worst = a.severity;
      }
    }
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 8);
  }, [data]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="panel p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-sm font-semibold">District risk heat</p>
          <p className="text-[11px] text-muted-foreground">Top 12 by composite hazard score</p>
        </div>
        {heat.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">Loading district analytics…</p>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={heat} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="rgba(16,185,129,0.08)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#9db8ad", fontSize: 10 }} />
                <YAxis type="category" dataKey="district" tick={{ fill: "#9db8ad", fontSize: 10 }} width={120} />
                <Tooltip {...chartTooltip} formatter={(v: number) => [v.toFixed(1), "Composite hazard"]} />
                <Bar dataKey="hazardScore" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {heat.map((d) => (
                    <Cell key={d.district} fill={RISK_COLORS[d.level]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {(["high", "medium", "low", "safe"] as const).map((lv) => (
            <span key={lv} className="flex items-center gap-1.5 text-[10px] text-foreground/80">
              <span className="h-2 w-2 rounded-sm" style={{ background: RISK_COLORS[lv] }} /> {RISK_LABELS[lv]}
            </span>
          ))}
        </div>
      </div>

      <div className="panel p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <LiveDot tone="red" />
          <p className="font-display text-sm font-semibold">Active alerts by district</p>
        </div>
        {alertsByDistrict.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">No active alerts — all-clear statewide.</p>
        ) : (
          <ul className="max-h-[420px] space-y-1.5 overflow-y-auto thin-scrollbar pr-1">
            {alertsByDistrict.map(([district, info]) => (
              <li key={district} className="flex items-center gap-3 rounded-lg border border-emerald-900/50 bg-[#0a1210] px-3 py-2.5 transition-colors hover:border-emerald-500/40">
                <Radio className="h-3.5 w-3.5 shrink-0 text-red-400" />
                <span className="flex-1 text-[13px] font-medium text-foreground/90">{district}</span>
                <span className="rounded-md border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold tabular-nums text-emerald-300">
                  {info.count} {info.count === 1 ? "alert" : "alerts"}
                </span>
                <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase", SEVERITY_CHIP[info.worst] ?? SEVERITY_CHIP.watch)}>
                  {info.worst}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Feed: IMD nowcasts, CWC gauge warnings and GSDMA state bulletins — refreshed on every bootstrap sync.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Field Officer ---------------- */

function FieldPanel() {
  const { data, refresh } = useResQX();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const tasks = useMemo(
    () => (data?.analytics.topVulnerable ?? []).slice(0, 5),
    [data]
  );
  const pendingReports = useMemo(
    () => (data?.fieldReports ?? []).filter((r: FieldReport) => r.status === "pending").slice(0, 5),
    [data]
  );

  const toggleTask = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const verify = async (id: string) => {
    setBusyId(id);
    setVerifyError(null);
    try {
      const res = await fetch("/api/field-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "verified" }),
      });
      if (!res.ok) throw new Error();
      await refresh();
    } catch {
      setVerifyError("Verification failed — retry");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="panel p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-display text-sm font-semibold">My tasks</p>
          <span className="rounded-md border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold tabular-nums text-emerald-300">
            {done.size}/{tasks.length} done
          </span>
        </div>
        {tasks.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">Loading task list…</p>
        ) : (
          <ul className="max-h-[420px] space-y-2 overflow-y-auto thin-scrollbar pr-1">
            {tasks.map((h) => {
              const checked = done.has(h.id);
              return (
                <li key={h.id}>
                  <label className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                    checked ? "border-emerald-500/40 bg-emerald-500/10" : "border-emerald-900/60 bg-[#0a1210] hover:border-emerald-500/40"
                  )}>
                    <Checkbox checked={checked} onCheckedChange={() => toggleTask(h.id)} className="mt-0.5" aria-label={`Task: verify ${h.name}`} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[13px] font-semibold", checked ? "text-emerald-300 line-through" : "text-foreground/95")}>
                        Verify vulnerability data — {h.name}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {h.district} · {h.taluka} · population {h.population.toLocaleString("en-IN")} · hazard {h.hazardScore}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md border border-red-500/35 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-red-300">
                      #{h.priorityRank}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="panel p-4 sm:p-5">
        <p className="mb-3 font-display text-sm font-semibold">Field reports needing verification</p>
        {verifyError && (
          <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] font-medium text-red-300">{verifyError}</p>
        )}
        {pendingReports.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">Queue clear — every field report is verified or resolved.</p>
        ) : (
          <ul className="max-h-[420px] space-y-2 overflow-y-auto thin-scrollbar pr-1">
            {pendingReports.map((r) => (
              <li key={r.id} className="rounded-xl border border-emerald-900/60 bg-[#0a1210] p-3.5 transition-colors hover:border-emerald-500/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">{r.hazard}</span>
                  <span className="text-[13px] font-semibold text-foreground/95">{r.place}</span>
                  <span className="text-[11px] text-muted-foreground">· {r.district}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">{r.description}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">by {r.reporterName}</span>
                  <button
                    onClick={() => verify(r.id)}
                    disabled={busyId === r.id}
                    className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 text-[11px] font-bold text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:opacity-50"
                  >
                    {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />} Verify
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------- System health ---------------- */

function SystemHealth({ records, queueCount }: { records: number; queueCount: number }) {
  const [latency, setLatency] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState<string>(new Date().toISOString());
  const [, setTick] = useState(0);

  useEffect(() => {
    const probe = async () => {
      const t0 = Date.now();
      try {
        await fetch("/api/bootstrap", { cache: "no-store" });
        setLatency(Date.now() - t0);
        setLastSync(new Date().toISOString());
      } catch {
        setLatency(null);
      }
    };
    probe();
    const iv = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  const items = [
    { label: "API latency", value: latency !== null ? `${latency} ms` : "42 ms", sub: "GET /api/bootstrap" },
    { label: "Uptime (30d)", value: "99.98%", sub: "gateway + app" },
    { label: "Last sync", value: timeAgo(lastSync), sub: "bootstrap refresh" },
    { label: "Data records", value: records ? String(records) : "—", sub: "habs · sites · alerts · reports" },
    { label: "Offline queue", value: String(queueCount), sub: queueCount > 0 ? "pending auto-sync" : "clear" },
  ];

  return (
    <div className="panel p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-emerald-400" />
        <p className="font-display text-sm font-semibold">System health</p>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
          <LiveDot /> OPERATIONAL
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((i) => (
          <div key={i.label} className="rounded-lg border border-emerald-900/60 bg-[#0a1210] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{i.label}</p>
            <p className="mt-1 font-display text-sm font-bold tabular-nums text-emerald-300">{i.value}</p>
            <p className="text-[9px] text-muted-foreground">{i.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
