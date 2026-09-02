"use client";
// ResQX shared UI atoms — consistent look across all 16 views
import React from "react";
import { motion } from "framer-motion";
import type { RiskLevel } from "@/lib/types";
import { RISK_COLORS, RISK_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

export const riskText: Record<RiskLevel, string> = {
  high: "text-red-400",
  medium: "text-orange-400",
  low: "text-yellow-400",
  safe: "text-emerald-400",
};

export const riskBg: Record<RiskLevel, string> = {
  high: "bg-red-500/10 border-red-500/40 text-red-400",
  medium: "bg-orange-500/10 border-orange-500/40 text-orange-400",
  low: "bg-yellow-500/10 border-yellow-500/40 text-yellow-400",
  safe: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
};

export const riskBgSolid: Record<RiskLevel, string> = {
  high: "bg-red-500 text-white",
  medium: "bg-orange-500 text-white",
  low: "bg-yellow-500 text-black",
  safe: "bg-emerald-500 text-black",
};

export function RiskBadge({ level, className, solid }: { level: RiskLevel; className?: string; solid?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        solid ? riskBgSolid[level] : riskBg[level],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: RISK_COLORS[level] }} />
      {level === "high" ? "HIGH RISK" : level === "medium" ? "MEDIUM" : level === "low" ? "LOW" : "SAFE"}
    </span>
  );
}

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 mb-4", className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  delay = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "danger" | "warning" | "success" | "info";
  delay?: number;
}) {
  const toneRing: Record<string, string> = {
    default: "text-emerald-400",
    danger: "text-red-400",
    warning: "text-orange-400",
    success: "text-emerald-400",
    info: "text-sky-400",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="panel panel-hover p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        {Icon && <Icon className={cn("h-4 w-4 shrink-0", toneRing[tone])} />}
      </div>
      <p className="font-display text-2xl sm:text-[1.7rem] font-bold mt-1.5 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  );
}

export function ScoreBar({
  value,
  max = 100,
  color,
  label,
  right,
  className,
}: {
  value: number;
  max?: number;
  color?: string;
  label?: string;
  right?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const auto = value >= 65 ? "#ef4444" : value >= 45 ? "#f97316" : value >= 25 ? "#eab308" : "#10b981";
  return (
    <div className={cn("w-full", className)}>
      {(label || right) && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <span className="text-[11px] font-semibold tabular-nums">{right ?? value.toFixed(0)}</span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-emerald-950/60 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color ?? auto }} />
      </div>
    </div>
  );
}

export function MapLegend({ metric }: { metric?: string }) {
  const items = [
    { color: RISK_COLORS.high, label: "High Risk (Red Zone)" },
    { color: RISK_COLORS.medium, label: "Medium Risk (Orange)" },
    { color: RISK_COLORS.low, label: "Low Risk (Yellow)" },
    { color: RISK_COLORS.safe, label: "Safe Zone (Green)" },
  ];
  return (
    <div className="panel p-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        Risk Legend{metric && metric !== "composite" ? ` — ${metric}` : " (Composite)"}
      </p>
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2 text-[11px] text-foreground/90">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </div>
      ))}
    </div>
  );
}

export function LiveDot({ tone = "emerald" }: { tone?: "emerald" | "red" | "orange" }) {
  const bg = tone === "red" ? "bg-red-500" : tone === "orange" ? "bg-orange-500" : "bg-emerald-500";
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping", bg)} />
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", bg)} />
    </span>
  );
}

export function MatchStatusPill({ status }: { status: "matched" | "partial" | "no_site" | "in_situ" }) {
  const map = {
    matched: { label: "FULL MATCH", cls: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" },
    partial: { label: "PHASED", cls: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400" },
    no_site: { label: "NO SITE — GAP", cls: "border-red-500/50 bg-red-500/10 text-red-400" },
    in_situ: { label: "IN-SITU MITIGATION", cls: "border-sky-500/50 bg-sky-500/10 text-sky-400" },
  } as const;
  const m = map[status];
  return <span className={cn("inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap", m.cls)}>{m.label}</span>;
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-emerald-950/40", className)} />;
}

export function EmptyState({ icon: Icon, title, hint }: { icon?: React.ComponentType<{ className?: string }>; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {Icon && <Icon className="h-10 w-10 text-emerald-800 mb-3" />}
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground/70 mt-1">{hint}</p>}
    </div>
  );
}

export function fmtIN(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function fmtCompact(n: number): string {
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
