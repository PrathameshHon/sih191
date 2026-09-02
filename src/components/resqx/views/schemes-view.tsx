"use client";
// ResQX — Government Schemes & Assistance (view: schemes)
// Builds strictly against frozen contracts: useResQX store, widgets, static-data.ts.
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, BadgeIndianRupee, Check, ChevronDown, Landmark,
} from "lucide-react";
import { useResQX } from "../store";
import { EmptyState, SectionHeader, SkeletonBlock } from "../widgets";
import { SCHEMES } from "@/lib/static-data";
import type { Scheme } from "@/lib/types";

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

function PanelHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

const EX_GRATIA = [
  { amount: "₹4,00,000", label: "Death" },
  { amount: "₹49,400", label: "Grievous injury" },
  { amount: "₹1,20,000", label: "Pucca house fully damaged" },
  { amount: "₹1,30,000", label: "Kutcha house fully damaged" },
];

const FLOW_STEPS = [
  "Incident verified by Talathi",
  "SDRF/NDRF norms applied",
  "DBT via Aadhaar",
  "Grievance: 1077 helpline",
];

// ---------- view ----------

export default function SchemesView() {
  const { data, loading } = useResQX();
  const [category, setCategory] = useState<string>("All");
  const [openElig, setOpenElig] = useState<Record<string, boolean>>({});

  const categories = useMemo(() => ["All", ...Array.from(new Set(SCHEMES.map((s) => s.category)))], []);

  const filtered = useMemo(
    () => (category === "All" ? SCHEMES : SCHEMES.filter((s) => s.category === category)),
    [category]
  );

  const toggleElig = (id: string) => setOpenElig((e) => ({ ...e, [id]: !e[id] }));

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <SkeletonBlock className="h-14" />
        <SkeletonBlock className="h-10" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-56" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Government Schemes & Assistance"
        subtitle="Central & Maharashtra state support — eligibility, benefits, enrolment"
        icon={Landmark}
      />

      {/* category filter chips */}
      <Reveal delay={0.05}>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter schemes by category">
          {categories.map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={active}
                className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-xs font-semibold transition-colors ${
                  active
                    ? "border-emerald-400 bg-emerald-500 text-black"
                    : "border-emerald-500/25 bg-emerald-500/5 text-emerald-300/80 hover:bg-emerald-500/15 hover:text-emerald-200"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </Reveal>

      {/* scheme cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s, i) => (
          <SchemeCard key={s.id} scheme={s} delay={0.03 * i} open={!!openElig[s.id]} onToggle={() => toggleElig(s.id)} />
        ))}
        {filtered.length === 0 && (
          <div className="panel sm:col-span-2 xl:col-span-3">
            <EmptyState icon={Landmark} title="No schemes in this category" hint="Pick another filter chip above." />
          </div>
        )}
      </div>

      {/* NDRF / SDRF statutory banner */}
      <Reveal delay={0.1}>
        <div className="panel border-amber-500/30 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <BadgeIndianRupee className="h-5 w-5 shrink-0 text-amber-400" />
            <h3 className="font-display text-sm font-semibold text-amber-200">NDRF / SDRF ex-gratia norms (statutory)</h3>
            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              NOTIFIED BY STATE EXECUTIVE COMMITTEE
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Fixed assistance payable from the State Disaster Response Fund on verified loss — no discretion, no case-by-case cut.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {EX_GRATIA.map((x) => (
              <div key={x.label} className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
                <p className="font-display text-lg font-bold text-amber-300 tabular-nums">{x.amount}</p>
                <p className="mt-0.5 text-[11px] text-amber-200/70">{x.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* assistance flow */}
      <Reveal delay={0.13}>
        <div className="panel panel-hover p-4 sm:p-5">
          <PanelHead title="How disaster assistance flows" sub="From field verification to money-in-account" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-1.5">
            {FLOW_STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex flex-1 items-center gap-2.5 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 font-display text-xs font-bold text-emerald-300 tabular-nums">
                    {i + 1}
                  </span>
                  <p className="text-xs font-medium leading-snug text-foreground/90">{step}</p>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div className="flex items-center justify-center sm:px-0.5">
                    <ArrowRight className="h-4 w-4 rotate-90 text-emerald-600 sm:rotate-0" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

// ---------- scheme card ----------

function SchemeCard({
  scheme: s,
  delay,
  open,
  onToggle,
}: {
  scheme: Scheme;
  delay: number;
  open: boolean;
  onToggle: () => void;
}) {
  const devanagari = s.nameHi || s.nameMr;
  const visibleBenefits = s.benefits.slice(0, 3);
  const extraBenefits = s.benefits.length - visibleBenefits.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="panel panel-hover flex h-full flex-col p-4"
    >
      <p className="text-[13px] font-semibold leading-snug text-foreground">{s.name}</p>
      {devanagari && <p className="mt-0.5 text-[11px] text-emerald-300/70">{devanagari}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border border-emerald-900/50 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80">
          {s.ministry}
        </span>
        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
          {s.category}
        </span>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{s.description}</p>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Key benefits</p>
      <ul className="mt-1.5 space-y-1.5">
        {visibleBenefits.map((b) => (
          <li key={b} className="flex items-start gap-1.5 text-xs text-foreground/85">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span className="min-w-0">{b}</span>
          </li>
        ))}
      </ul>
      {extraBenefits > 0 && (
        <p className="mt-1.5 text-[11px] font-semibold text-emerald-300">+{extraBenefits} more</p>
      )}

      {/* expandable eligibility */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="mt-auto inline-flex min-h-[44px] w-full items-center gap-1.5 pt-2 text-[11px] font-semibold text-emerald-300 transition-colors hover:text-emerald-200"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        Eligibility
      </button>
      {open && (
        <motion.ul
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden space-y-1.5 rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-2.5"
        >
          {s.eligibility.map((e) => (
            <li key={e} className="flex items-start gap-1.5 text-xs text-foreground/85">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
              <span className="min-w-0">{e}</span>
            </li>
          ))}
        </motion.ul>
      )}

      <p className="mt-2 border-t border-emerald-900/40 pt-2 text-[10px] text-muted-foreground">
        Apply: district e-seva / CSC / bank
      </p>
    </motion.div>
  );
}
