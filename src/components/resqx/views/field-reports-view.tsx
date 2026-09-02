"use client";
// ResQX — Citizen / Field Hazard Reporting (offline-first)
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck, Camera, CheckCircle2, ClipboardList, CloudUpload, Loader2, LocateFixed,
  MapPin, Send, ShieldAlert, Trash2, User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FieldReport } from "@/lib/types";
import { useResQX } from "../store";
import { SectionHeader, StatCard, EmptyState, timeAgo } from "../widgets";
import { cn } from "@/lib/utils";

const HAZARDS = ["flood", "landslide", "earthquake", "cyclone", "drought", "other"] as const;
const SEVERITIES = ["critical", "warning", "advisory"] as const;

const SEVERITY_BAND: Record<(typeof SEVERITIES)[number], string> = {
  critical: "bg-red-500",
  warning: "bg-orange-500",
  advisory: "bg-yellow-500",
};

const STATUS_CHIP: Record<FieldReport["status"], string> = {
  pending: "border-amber-500/45 bg-amber-500/10 text-amber-400",
  verified: "border-emerald-500/45 bg-emerald-500/10 text-emerald-400",
  resolved: "border-sky-500/45 bg-sky-500/10 text-sky-400",
};

type Filter = "all" | FieldReport["status"];
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "verified", label: "Verified" },
  { id: "resolved", label: "Resolved" },
];

const PUNE = { lat: 18.5204, lng: 73.8567 };

export default function FieldReportsView() {
  const { data, submitFieldReport, queue, clearQueue, online, refresh } = useResQX();

  const reports = data?.fieldReports ?? [];
  const counts = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((r) => r.status === "pending").length,
      verified: reports.filter((r) => r.status === "verified").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
    }),
    [reports]
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Field Hazard Reports"
        subtitle="Crowd-sourced ground truth from citizens & field officers — works offline"
        icon={Camera}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Total reports" value={counts.total} icon={ClipboardList} />
        <StatCard label="Pending" value={counts.pending} icon={Loader2} tone="warning" />
        <StatCard label="Verified" value={counts.verified} icon={BadgeCheck} tone="success" />
        <StatCard label="Resolved" value={counts.resolved} icon={CheckCircle2} tone="info" />
        <StatCard label="Queued (offline)" value={queue.length} icon={CloudUpload} tone={queue.length > 0 ? "warning" : "default"} sub="auto-syncs when online" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <SubmitPanel />
        <FeedPanel reports={reports} counts={counts} refresh={refresh} />
      </div>
    </div>
  );
}

/* ---------------- Submit form + offline queue ---------------- */

function SubmitPanel() {
  const { submitFieldReport, queue, clearQueue, online, data } = useResQX();

  const [reporterName, setReporterName] = useState("");
  const [phone, setPhone] = useState("");
  const [hazard, setHazard] = useState<(typeof HAZARDS)[number]>("flood");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("warning");
  const [district, setDistrict] = useState("");
  const [place, setPlace] = useState("");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState(PUNE);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "queued" | "error"; text: string } | null>(null);

  const districts = (data?.analytics.districtRisk ?? []).map((d) => d.district);

  const useMyLocation = () => {
    setLocError(null);
    if (!("geolocation" in navigator)) {
      setLocError("Geolocation not supported on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: +pos.coords.latitude.toFixed(4), lng: +pos.coords.longitude.toFixed(4) });
        setLocating(false);
      },
      () => {
        setLocError("Location permission denied — using Pune as default");
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterName.trim() || !description.trim()) {
      setFeedback({ kind: "error", text: "Name and description are required" });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await submitFieldReport({
        reporterName: reporterName.trim(),
        phone: phone.trim() || undefined,
        hazard,
        severity,
        description: description.trim(),
        lat: coords.lat,
        lng: coords.lng,
        district: district.trim() || "Unknown",
        place: place.trim() || district.trim() || "Unknown",
      });
      setFeedback(
        res === "queued"
          ? { kind: "queued", text: "Report queued — will sync when online" }
          : { kind: "ok", text: "Report submitted" }
      );
      if (res === "sent") {
        setDescription("");
        setPlace("");
      }
    } catch {
      setFeedback({ kind: "error", text: "Could not submit — try again" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 lg:col-span-2">
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onSubmit={submit}
        className="panel space-y-3.5 p-4 sm:p-5"
      >
        <p className="font-display text-sm font-semibold">Submit Field Report</p>

        {!online && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-300">
            Offline — reports queue automatically
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Your name *</span>
            <Input value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder="e.g. S. Jadhav" className="border-emerald-900/60 bg-[#0a1210]" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Phone (optional)</span>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" inputMode="tel" className="border-emerald-900/60 bg-[#0a1210]" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Hazard type</span>
            <Select value={hazard} onValueChange={(v) => setHazard(v as (typeof HAZARDS)[number])}>
              <SelectTrigger className="border-emerald-900/60 bg-[#0a1210]" aria-label="Hazard type"><SelectValue /></SelectTrigger>
              <SelectContent className="border-emerald-900/60 bg-[#0a1210]">
                {HAZARDS.map((h) => <SelectItem key={h} value={h} className="capitalize">{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Severity</span>
            <Select value={severity} onValueChange={(v) => setSeverity(v as (typeof SEVERITIES)[number])}>
              <SelectTrigger className="border-emerald-900/60 bg-[#0a1210]" aria-label="Severity"><SelectValue /></SelectTrigger>
              <SelectContent className="border-emerald-900/60 bg-[#0a1210]">
                {SEVERITIES.map((sv) => <SelectItem key={sv} value={sv} className="capitalize">{sv}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">District</span>
            <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Raigad" list="resqx-districts" className="border-emerald-900/60 bg-[#0a1210]" />
            <datalist id="resqx-districts">
              {districts.map((d) => <option key={d} value={d} />)}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Place / village</span>
            <Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Taliye" className="border-emerald-900/60 bg-[#0a1210]" />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">What is happening? *</span>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the hazard — water level, damage, people affected…" rows={3} className="resize-none border-emerald-900/60 bg-[#0a1210]" />
        </label>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={useMyLocation}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/5 px-3.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
          >
            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
            Use my location
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-2.5 py-1.5 text-[11px] font-semibold tabular-nums text-emerald-300">
            <MapPin className="h-3 w-3" /> {coords.lat}, {coords.lng}
          </span>
        </div>
        {locError && <p className="text-[11px] text-red-400">{locError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition-colors hover:bg-emerald-500 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? "Submitting…" : "Submit report"}
        </button>

        {feedback && (
          <p
            role="status"
            className={cn(
              "rounded-lg border px-3 py-2 text-[11px] font-medium",
              feedback.kind === "ok" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
              feedback.kind === "queued" && "border-amber-500/40 bg-amber-500/10 text-amber-300",
              feedback.kind === "error" && "border-red-500/40 bg-red-500/10 text-red-300"
            )}
          >
            {feedback.text}
          </p>
        )}
      </motion.form>

      {/* offline queue */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 }} className="panel p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-display text-sm font-semibold">
            <CloudUpload className="h-4 w-4 text-amber-400" /> Offline queue
          </p>
          <span className={cn(
            "rounded-md border px-2 py-0.5 text-[10px] font-bold tabular-nums",
            queue.length > 0 ? "border-amber-500/45 bg-amber-500/10 text-amber-400" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          )}>
            {queue.length} {queue.length === 1 ? "report" : "reports"}
          </span>
        </div>
        {queue.length > 0 ? (
          <ul className="mb-3 max-h-[132px] space-y-1.5 overflow-y-auto thin-scrollbar pr-1">
            {queue.map((q, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg border border-emerald-900/50 bg-[#0a1210] px-2.5 py-2 text-[11px]">
                <ShieldAlert className="h-3 w-3 shrink-0 text-amber-400" />
                <span className="truncate font-medium text-foreground/85">{q.place || q.district} — {q.hazard}</span>
                <span className="ml-auto shrink-0 text-muted-foreground">{q.reporterName}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-[11px] text-muted-foreground">Queue empty — all field reports synced.</p>
        )}
        <p className="mb-3 text-[10px] leading-relaxed text-muted-foreground">
          Sync happens automatically the moment connectivity returns — no action needed. Clearing discards unsent reports permanently.
        </p>
        <button
          onClick={clearQueue}
          disabled={queue.length === 0}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-red-500/35 px-3.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear queue
        </button>
      </motion.div>
    </div>
  );
}

/* ---------------- Report feed ---------------- */

function FeedPanel({
  reports,
  counts,
  refresh,
}: {
  reports: FieldReport[];
  counts: { total: number; pending: number; verified: number; resolved: number };
  refresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const shown = filter === "all" ? reports : reports.filter((r) => r.status === filter);

  const setStatus = async (id: string, status: FieldReport["status"]) => {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch("/api/field-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
      await refresh();
    } catch {
      setActionError("Status update failed — retry");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="panel p-4 sm:p-5 lg:col-span-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-sm font-semibold">Report Feed</p>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const n = f.id === "all" ? counts.total : counts[f.id];
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  "min-h-[36px] rounded-full border px-3 text-[11px] font-semibold transition-colors",
                  filter === f.id
                    ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
                    : "border-emerald-900/60 bg-[#0a1210] text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label} <span className="tabular-nums opacity-70">({n})</span>
              </button>
            );
          })}
        </div>
      </div>

      {actionError && (
        <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] font-medium text-red-300">{actionError}</p>
      )}

      {shown.length === 0 ? (
        <EmptyState icon={Camera} title="No reports in this view" hint="Citizen reports appear here in real time" />
      ) : (
        <ul className="max-h-[560px] space-y-2.5 overflow-y-auto thin-scrollbar pr-1">
          {shown.map((r) => (
            <li key={r.id} className="relative overflow-hidden rounded-xl border border-emerald-900/50 bg-[#0a1210] p-3.5 pl-4.5">
              <span className={cn("absolute inset-y-0 left-0 w-1", SEVERITY_BAND[r.severity] ?? SEVERITY_BAND.warning)} aria-hidden />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-1">
                <span className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                  {r.hazard}
                </span>
                <span className="text-[13px] font-semibold text-foreground/95">{r.place}</span>
                <span className="text-[11px] text-muted-foreground">· {r.district}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
              </div>
              <p className="mt-2 pl-1 text-xs leading-relaxed text-foreground/80">{r.description}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 pl-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <User className="h-3 w-3" /> {r.reporterName}
                  {r.phone && <span className="tabular-nums">· {r.phone}</span>}
                </span>
                <span className={cn("ml-auto rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide", STATUS_CHIP[r.status])}>
                  {r.status.toUpperCase()}
                </span>
                {r.status !== "verified" && r.status !== "resolved" && (
                  <button
                    onClick={() => setStatus(r.id, "verified")}
                    disabled={busyId === r.id}
                    className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md border border-emerald-500/40 px-2.5 text-[10px] font-bold text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:opacity-50"
                  >
                    {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <BadgeCheck className="h-3 w-3" />} Verify
                  </button>
                )}
                {r.status !== "resolved" && (
                  <button
                    onClick={() => setStatus(r.id, "resolved")}
                    disabled={busyId === r.id}
                    className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md border border-sky-500/40 px-2.5 text-[10px] font-bold text-sky-300 transition-colors hover:bg-sky-500/15 disabled:opacity-50"
                  >
                    {busyId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Resolve
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
