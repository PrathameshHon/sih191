"use client";
// ResQX Home — premium landing (dark emerald, Maharashtra)
import React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, BellRing, Building2, Camera, FileText, FlaskConical, Globe, Landmark,
  LayoutDashboard, Map as MapIcon, PieChart, Satellite, ShieldCheck, ShieldEllipsis,
  Truck, Users, ChevronRight, Menu, X, Droplets, Mountain, Zap, Waves, Sun, Radio,
} from "lucide-react";
import { useState } from "react";
import { useResQX } from "../store";
import { useI18n, LANGS } from "@/lib/i18n";
import { LiveDot, fmtCompact } from "../widgets";
import { cn } from "@/lib/utils";
import type { ViewId } from "@/lib/nav";

const FLOW = [
  { icon: MapIcon, label: "Multi-Hazard Risk Map", view: "map" as ViewId },
  { icon: Zap, label: "AI Hazard Score", view: "map" as ViewId },
  { icon: Users, label: "Vulnerability Index", view: "vulnerability" as ViewId },
  { icon: Landmark, label: "Carrying Capacity", view: "capacity" as ViewId },
  { icon: Truck, label: "Relocation Priority", view: "relocation" as ViewId },
  { icon: ShieldCheck, label: "Safe-Site Matching", view: "relocation" as ViewId },
];

const MODULES: { icon: React.ComponentType<{ className?: string }>; label: string; desc: string; view: ViewId }[] = [
  { icon: BellRing, label: "Real-time Alerts", desc: "IMD · CWC · GSDMA early warnings", view: "alerts" },
  { icon: Landmark, label: "Government Schemes", desc: "PMAY-G, PMFBY, NDRF/SDRF norms", view: "schemes" },
  { icon: ShieldCheck, label: "Insurance & Protection", desc: "PMSBY ₹20/yr, crop & life cover", view: "protection" },
  { icon: Building2, label: "Infrastructure & Shelters", desc: "Hospitals, dams, cyclone shelters", view: "infrastructure" },
  { icon: Camera, label: "Field Hazard Reporting", desc: "Citizen reports, offline-first", view: "field-reports" },
  { icon: FlaskConical, label: "What-if Simulation", desc: "Rainfall +40%? Red zone expands live", view: "simulation" },
  { icon: Satellite, label: "Satellite Land-use", desc: "Sentinel-2 built-up & encroachment", view: "satellite" },
  { icon: PieChart, label: "Advanced Analytics", desc: "District risk, vulnerability curves", view: "analytics" },
  { icon: FileText, label: "Government Reports", desc: "One-click DDMP-ready reports", view: "gov-reports" },
  { icon: Truck, label: "Relief & Rehabilitation", desc: "₹-tracking of projects on ground", view: "admin" },
  { icon: ShieldEllipsis, label: "Role-based Admin", desc: "Collector / SDMA / Field Officer", view: "admin" },
];

const EVENT_CHIPS = [
  { icon: Waves, text: "26 July 2005 — Mumbai deluge, 944 mm/24h" },
  { icon: Mountain, text: "Malin 2014 & Taliye 2020 landslides" },
  { icon: Radio, text: "Cyclone Nisarga landfall — Alibag 2020" },
  { icon: Droplets, text: "Krishna–Panchganga floods 2019 & 2021" },
  { icon: Zap, text: "Killari earthquake 1993 — M 6.2" },
  { icon: Sun, text: "Marathwada chronic drought belt" },
];

const SOURCES = ["Bhuvan (ISRO/NRSC)", "IMD", "CWC", "NDMA / SDMA", "Census 2011", "SECC", "GSDA", "OpenStreetMap"];

export default function HomeView() {
  const { data, setView, loading } = useResQX();
  const { t, lang, setLang } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const totals = data?.analytics.totals;

  const nav = (v: ViewId) => {
    setMenuOpen(false);
    setView(v);
  };

  const stats = [
    { value: totals ? String(totals.habitations) : "94", label: t("home.stats.analyzed") },
    { value: totals ? String(totals.districts) : "33", label: t("home.stats.districts") },
    { value: totals ? fmtCompact(totals.population) : "3.4M", label: t("home.stats.impact") },
    { value: "98%", label: t("home.stats.accuracy") },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#070d0b]">
      {/* top nav */}
      <header className="sticky top-0 z-40 border-b border-emerald-900/40 bg-[#070d0b]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <button onClick={() => setView("home")} className="flex items-center gap-2.5" aria-label="ResQX">
            <img src="/icon.svg" alt="ResQX logo" className="h-9 w-9 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
            <span className="font-display text-2xl font-bold tracking-tight">
              Res<span className="text-emerald-400">QX</span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {([
              ["nav.map", "map"], ["nav.analytics", "analytics"], ["nav.relocation", "relocation"],
              ["nav.alerts", "alerts"], ["nav.govreports", "gov-reports"], ["nav.admin", "admin"],
            ] as [string, ViewId][]).map(([key, v]) => (
              <button
                key={v}
                onClick={() => nav(v)}
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                {t(key)}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-1 sm:flex">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                    l.code === lang ? "bg-emerald-500/20 text-emerald-300" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {l.code.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => nav("dashboard")}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              Live Dashboard
            </button>
            <button className="rounded-lg p-2 text-muted-foreground md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-emerald-900/40 bg-[#0a1210] px-4 py-3 md:hidden">
            <div className="grid grid-cols-2 gap-1.5">
              {MODULES.slice(0, 10).map((m) => (
                <button key={m.label} onClick={() => nav(m.view)} className="flex items-center gap-2 rounded-lg border border-emerald-900/50 px-3 py-2 text-left text-xs text-foreground/85 hover:bg-emerald-500/10">
                  <m.icon className="h-3.5 w-3.5 text-emerald-400" /> {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/hero-bg.png" alt="Monsoon valley in the Western Ghats of Maharashtra" className="h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070d0b]/70 via-[#070d0b]/60 to-[#070d0b]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070d0b]/90 via-transparent to-[#070d0b]/70" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 sm:pb-24 sm:pt-28">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
              <LiveDot /> Smart India Hackathon · PS191 · Maharashtra
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.08] sm:text-6xl">
              <span className="text-emerald-400">{t("home.hero.title1")}</span>
              <br />
              <span className="text-foreground">{t("home.hero.title2")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-foreground/75 sm:text-base">{t("home.hero.desc")}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={() => nav("map")}
                className="group flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/50 transition-all hover:bg-emerald-500 hover:shadow-emerald-700/50"
              >
                {t("common.exploreMap")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => nav("dashboard")}
                className="rounded-xl border border-emerald-500/35 bg-emerald-500/5 px-6 py-3 text-sm font-semibold text-emerald-300 backdrop-blur transition-colors hover:bg-emerald-500/15"
              >
                {t("common.viewDashboard")}
              </button>
            </div>
          </motion.div>

          {/* stats */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-14 grid grid-cols-2 gap-3 sm:mt-20 lg:grid-cols-4"
          >
            {stats.map((s, i) => (
              <div key={s.label} className={cn("panel p-4 sm:p-5", i === 0 && "glow-primary")}>
                <p className="font-display text-2xl font-bold text-emerald-400 sm:text-3xl tabular-nums">{loading ? "…" : s.value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* core flow */}
      <section className="border-y border-emerald-900/40 bg-[#090f0d]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-500">The ResQX Core Flow — three linked engines, one decision</p>
          <div className="flex flex-wrap items-stretch justify-center gap-2">
            {FLOW.map((f, i) => (
              <motion.button
                key={f.label}
                initial={{ opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                onClick={() => nav(f.view)}
                className="group flex min-w-[130px] flex-1 flex-col items-center gap-2 rounded-xl border border-emerald-500/20 bg-[#0c1411] px-3 py-4 text-center transition-all hover:border-emerald-400/50 hover:bg-emerald-500/10 sm:min-w-[150px]"
              >
                <f.icon className="h-5 w-5 text-emerald-400 transition-transform group-hover:scale-110" />
                <span className="text-[11px] font-semibold leading-tight text-foreground/90">{f.label}</span>
                <span className="text-[9px] font-mono text-muted-foreground">STEP {i + 1}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* modules */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            One platform. <span className="text-gradient">Every disaster decision.</span>
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-xs text-muted-foreground sm:text-sm">
            From hazard identification to rehabilitation tracking — ResQX covers the complete disaster management cycle for the Government of Maharashtra.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m, i) => (
            <motion.button
              key={m.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 3) * 0.06, duration: 0.4 }}
              onClick={() => nav(m.view)}
              className="panel panel-hover group flex items-start gap-3.5 p-4 text-left"
            >
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                <m.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  {m.label}
                  <ChevronRight className="h-3.5 w-3.5 text-emerald-500 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{m.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* real data credibility strip */}
      <section className="border-y border-emerald-900/40 bg-[#090f0d]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-500">Calibrated on Maharashtra's real disaster history</p>
          <div className="flex flex-wrap justify-center gap-2">
            {EVENT_CHIPS.map((c) => (
              <span key={c.text} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-[#0c1411] px-3.5 py-2 text-[11px] text-foreground/85">
                <c.icon className="h-3.5 w-3.5 text-emerald-400" /> {c.text}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-emerald-900/40 pt-6">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Data sources</span>
            {SOURCES.map((s) => (
              <span key={s} className="text-[11px] font-semibold text-emerald-300/80">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14">
        <div className="panel sweep relative overflow-hidden p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl font-bold sm:text-4xl">
            Ready to see <span className="text-gradient">Maharashtra's risk</span> in real time?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Open the live command centre — hazard map, vulnerability ranking, carrying capacity and relocation matching, updated with live alerts.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button onClick={() => nav("dashboard")} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500">
              <LayoutDashboard className="h-4 w-4" /> Open Command Centre
            </button>
            <button onClick={() => nav("simulation")} className="rounded-xl border border-emerald-500/35 px-6 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10">
              Try What-if Simulation
            </button>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="mt-auto border-t border-emerald-900/40 bg-[#060b09]">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <img src="/icon.svg" alt="ResQX" className="h-7 w-7" />
              <div>
                <p className="font-display text-lg font-bold">Res<span className="text-emerald-400">QX</span></p>
                <p className="text-[10px] text-muted-foreground">{t("brand.tagline")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <Globe className="h-3.5 w-3.5 text-emerald-500" /> www.resqx.in · hello@resqx.in
            </div>
          </div>
          <p className="mt-6 text-center text-[10px] text-muted-foreground/60">
            ResQX · Government-grade disaster decision support · Data: Bhuvan, IMD, CWC, NDMA, Census 2011, SECC · Basemap © Esri, OpenStreetMap
          </p>
        </div>
      </footer>
    </div>
  );
}
