"use client";
// ResQX — Auto-generated Government Reports (DDMP-ready, printable)
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Download, FileText, Landmark, Loader2, MapPinned, Printer, ShieldAlert, Truck, Copy, Check, RotateCcw,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useResQX } from "../store";
import { SectionHeader, EmptyState } from "../widgets";
import { cn } from "@/lib/utils";

type GovReportType = "red-zone" | "relocation-plan" | "district-summary" | "capacity" | "executive";

interface GovReport {
  header: {
    title: string;
    reportId: string;
    generatedAt: string;
    scope: string;
    preparedBy: string;
    classification: string;
  };
  kpis: { label: string; value: string }[];
  sections: { heading: string; lines: string[] }[];
}

const REPORT_TYPES: { id: GovReportType; name: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "red-zone", name: "Red Zone Report", desc: "High-risk habitation register with weighted hazard scores", icon: ShieldAlert },
  { id: "relocation-plan", name: "Relocation Plan", desc: "Priority matching of red-zone settlements to safe sites", icon: Truck },
  { id: "district-summary", name: "District Summary", desc: "District hazard, vulnerability & capacity profile", icon: MapPinned },
  { id: "executive", name: "Executive Summary", desc: "One-page state status brief for senior leadership", icon: FileText },
  { id: "capacity", name: "Capacity & Gap Report", desc: "Carrying capacity assessment & Phase-2 land gap statement", icon: Landmark },
];

export default function GovReportsView() {
  const { data } = useResQX();

  const districts = useMemo(
    () => (data?.analytics.districtRisk ?? []).map((d) => d.district),
    [data]
  );
  const [scope, setScope] = useState("ALL");
  const [selectedType, setSelectedType] = useState<GovReportType | null>(null);
  const [report, setReport] = useState<GovReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (type: GovReportType, districtScope: string) => {
    setSelectedType(type);
    setGenerating(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/gov-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, district: districtScope === "ALL" ? "ALL" : districtScope }),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setReport((await res.json()) as GovReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report generation failed");
      setReport(null);
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setReport(null);
    setSelectedType(null);
    setError(null);
    setCopied(false);
  };

  const reportText = useMemo(() => {
    if (!report) return "";
    const parts = [
      report.header.title,
      `Report ID: ${report.header.reportId}`,
      `Generated: ${new Date(report.header.generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
      `Scope: ${report.header.scope === "ALL" ? "State (all districts)" : report.header.scope}`,
      `Prepared by: ${report.header.preparedBy}`,
      `Classification: ${report.header.classification}`,
      "",
      "KEY INDICATORS",
      ...report.kpis.map((k) => `- ${k.label}: ${k.value}`),
      "",
    ];
    for (const sec of report.sections) {
      parts.push(sec.heading.toUpperCase());
      parts.push(...sec.lines.map((l) => `- ${l}`));
      parts.push("");
    }
    return parts.join("\n");
  }, [report]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const worstDistrict = data?.analytics.districtRisk[0]?.district ?? "Raigad";
  const secondDistrict = data?.analytics.districtRisk[1]?.district ?? "Kolhapur";

  const recent = useMemo(
    () => [
      { name: `Red Zone Report — Maharashtra (State)`, scope: "ALL", type: "red-zone" as GovReportType, when: "today" },
      { name: `Red Zone Report — ${worstDistrict}`, scope: worstDistrict, type: "red-zone" as GovReportType, when: "today" },
      { name: `Relocation Plan — ${worstDistrict}`, scope: worstDistrict, type: "relocation-plan" as GovReportType, when: "yesterday" },
      { name: `District Summary — ${secondDistrict}`, scope: secondDistrict, type: "district-summary" as GovReportType, when: "2d ago" },
      { name: `Executive Summary — State DDMP annexure`, scope: "ALL", type: "executive" as GovReportType, when: "3d ago" },
    ],
    [worstDistrict, secondDistrict]
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Reports & Documents"
        subtitle="Generate DDMP-ready government reports from live data"
        icon={FileText}
      />

      {/* scope + report type cards */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">Report scope</span>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-[260px] border-emerald-900/60 bg-[#0a1210]" aria-label="Report scope">
            <SelectValue placeholder="Select scope" />
          </SelectTrigger>
          <SelectContent className="max-h-[320px] border-emerald-900/60 bg-[#0a1210]">
            <SelectItem value="ALL">ALL — State</SelectItem>
            {districts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {REPORT_TYPES.map((rt, i) => (
          <motion.button
            key={rt.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            onClick={() => generate(rt.id, scope)}
            className={cn(
              "panel panel-hover flex flex-col items-start gap-2 p-4 text-left",
              selectedType === rt.id && "border-emerald-400/60 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]"
            )}
          >
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-emerald-400">
              <rt.icon className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">{rt.name}</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{rt.desc}</p>
            <span className="mt-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-500">
              {generating && selectedType === rt.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Generate
            </span>
          </motion.button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-300">
          Report generation failed ({error}) — please retry.
        </div>
      )}

      {/* preview */}
      {report && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              <Printer className="h-4 w-4" /> Download PDF
            </button>
            <button
              onClick={copySummary}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/5 px-4 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy summary"}
            </button>
            <button
              onClick={reset}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-900/60 px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" /> Generate new
            </button>
          </div>

          <div className="print-area panel p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-900/50 pb-4">
              <div className="flex items-center gap-3">
                <img src="/icon.svg" alt="ResQX" className="h-5 w-5" />
                <div>
                  <h3 className="font-display text-lg font-bold leading-tight">{report.header.title}</h3>
                  <p className="text-[10px] text-muted-foreground">{report.header.preparedBy}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex rounded-md border border-amber-500/45 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-400">
                  {report.header.classification.toUpperCase()}
                </span>
                <p className="mt-1.5 text-[10px] text-muted-foreground tabular-nums">{report.header.reportId}</p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {new Date(report.header.generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Scope: {report.header.scope === "ALL" ? "State (all districts)" : report.header.scope}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {report.kpis.map((k) => (
                <div key={k.label} className="rounded-lg border border-emerald-900/60 bg-[#0a1210] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
                  <p className="mt-1 font-display text-base font-bold tabular-nums text-emerald-300">{k.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-5">
              {report.sections.map((sec) => (
                <section key={sec.heading}>
                  <h4 className="mb-2 font-display text-sm font-bold text-emerald-300">{sec.heading}</h4>
                  <ul className="space-y-1.5">
                    {sec.lines.map((line, idx) => (
                      <li key={idx} className="flex gap-2 text-xs leading-relaxed text-foreground/85">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* recent reports strip */}
      <div className="panel p-4 sm:p-5">
        <p className="mb-3 font-display text-sm font-semibold">Recent reports</p>
        <ul className="space-y-1.5">
          {recent.map((r) => (
            <li key={r.name} className="flex items-center gap-3 rounded-lg border border-emerald-900/50 bg-[#0a1210] px-3 py-2.5 transition-colors hover:border-emerald-500/40">
              <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-foreground/90">{r.name}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {r.scope === "ALL" ? "State" : r.scope} · generated {r.when}
                </span>
              </span>
              <button
                onClick={() => generate(r.type, r.scope)}
                aria-label={`Regenerate ${r.name}`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/35 text-emerald-300 transition-colors hover:bg-emerald-500/15"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {!report && !generating && !error && (
        <div className="panel">
          <EmptyState icon={FileText} title="No report generated yet" hint="Pick a report type above — the preview renders here, print-ready" />
        </div>
      )}
    </div>
  );
}
