"use client";
// ResQX app shell — sidebar + topbar + view router + offline banner + language switcher
import React, { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, CloudOff, Globe, Menu, Search, ShieldCheck, BellRing, RefreshCw, X } from "lucide-react";
import { NAV_GROUPS, type ViewId } from "@/lib/nav";
import { LANGS, useI18n } from "@/lib/i18n";
import { useResQX } from "./store";
import { VIEW_COMPONENTS } from "./views/registry";
import { AiAssistant } from "./ai-assistant";
import { LiveDot } from "./widgets";
import { cn } from "@/lib/utils";
import { fmtCompact } from "./widgets";

function Brand({ onClick, compact }: { onClick?: () => void; compact?: boolean }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 text-left" aria-label="ResQX home">
      <img src="/icon.svg" alt="ResQX logo" className="h-8 w-8 shrink-0 drop-shadow-[0_0_10px_rgba(16,185,129,0.45)]" />
      {!compact && (
        <span className="leading-tight">
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Res<span className="text-emerald-400">QX</span>
          </span>
          <span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Maharashtra DDM</span>
        </span>
      )}
    </button>
  );
}

function LanguageMenu() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-1.5 text-xs text-foreground/90 hover:bg-emerald-500/15"
        aria-label="Language"
      >
        <Globe className="h-3.5 w-3.5 text-emerald-400" />
        <span>{current?.native}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1.5 w-36 overflow-hidden rounded-lg border border-emerald-500/25 bg-[#0d1714] shadow-xl">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={cn(
                  "block w-full px-3 py-2 text-left text-xs hover:bg-emerald-500/10",
                  l.code === lang ? "text-emerald-400 font-semibold" : "text-foreground/85"
                )}
              >
                {l.native} <span className="text-muted-foreground">· {l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView, data } = useResQX();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const criticalAlerts = data?.alerts.filter((a) => a.active && (a.severity === "critical" || a.severity === "warning")).length ?? 0;

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-emerald-900/40 bg-[#0a1210]/95 backdrop-blur transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn("flex items-center justify-between px-4 py-4", collapsed && "justify-center px-2")}>
        <Brand compact={collapsed} onClick={() => setView("home")} />
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="hidden rounded-md p-1 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400 lg:block"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="thin-scrollbar flex-1 overflow-y-auto px-2 pb-4" aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <div key={group.labelKey} className="mb-3">
            {!collapsed && (
              <p className="mb-1 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-700">{t(group.labelKey)}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = view === item.id;
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setView(item.id as ViewId);
                        onNavigate?.();
                      }}
                      title={t(item.labelKey)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
                        collapsed && "justify-center px-2",
                        active
                          ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 font-semibold"
                          : "border border-transparent text-foreground/75 hover:bg-emerald-500/8 hover:text-emerald-200"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-emerald-400" : "text-muted-foreground group-hover:text-emerald-400")} />
                      {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                      {item.badge === "alerts" && criticalAlerts > 0 && (
                        <span className={cn("ml-auto rounded-full bg-red-500/90 px-1.5 text-[10px] font-bold text-white", collapsed && "absolute")}>{criticalAlerts}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-emerald-900/40 p-3">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" /> GOVT-GRADE · SIH PS191
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Bhuvan · IMD · CWC · Census 2011 · SECC · NDMA
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { data, refresh, loading, online, queuedCount, setView } = useResQX();
  const { t: tt } = useI18n();
  const [q, setQ] = useState("");
  const criticals = data?.alerts.filter((a) => a.active && a.severity === "critical").length ?? 0;
  const totals = data?.analytics.totals;

  const results = useMemo(() => {
    if (!q.trim() || !data) return [];
    const needle = q.toLowerCase();
    return data.habitations
      .filter((h) => h.name.toLowerCase().includes(needle) || h.district.toLowerCase().includes(needle) || h.taluka.toLowerCase().includes(needle))
      .slice(0, 7);
  }, [q, data]);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-emerald-900/40 bg-[#0a1210]/90 px-3 backdrop-blur sm:px-4">
      <button onClick={onOpenMenu} className="rounded-md p-2 text-muted-foreground hover:bg-emerald-500/10 lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      {/* search */}
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tt("common.search")}
          className="h-9 w-full rounded-lg border border-emerald-500/20 bg-background/50 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        />
        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-lg border border-emerald-500/25 bg-[#0d1714] shadow-2xl">
            {results.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setQ("");
                  setView("map");
                  window.dispatchEvent(new CustomEvent("resqx:focus-habitation", { detail: h.id }));
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-emerald-500/10"
              >
                <span className="truncate text-foreground/90">
                  {h.name} <span className="text-muted-foreground">· {h.taluka}, {h.district}</span>
                </span>
                <span className={cn("shrink-0 text-[10px] font-bold", h.riskLevel === "high" ? "text-red-400" : h.riskLevel === "medium" ? "text-orange-400" : "text-emerald-400")}>
                  {h.hazardScore.toFixed(0)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {totals && (
          <div className="hidden xl:flex items-center gap-4 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-1.5 text-[10px] text-muted-foreground">
            <span><span className="font-bold text-foreground">{totals.habitations}</span> habitations</span>
            <span><span className="font-bold text-red-400">{totals.highRiskHabitations}</span> red-zone</span>
            <span><span className="font-bold text-foreground">{fmtCompact(totals.population)}</span> pop</span>
          </div>
        )}

        <div className={cn("hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium sm:flex", online ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" : "border-orange-500/40 bg-orange-500/10 text-orange-400")}>
          {online ? <LiveDot /> : <CloudOff className="h-3.5 w-3.5" />}
          {online ? tt("common.online") : `${tt("common.offline")}${queuedCount ? ` (${queuedCount})` : ""}`}
        </div>

        <LanguageMenu />

        <button
          onClick={refresh}
          disabled={loading}
          className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2 text-emerald-400 hover:bg-emerald-500/15"
          aria-label="Refresh data"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </button>

        <button
          onClick={() => setView("alerts")}
          className="relative rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2 text-emerald-400 hover:bg-emerald-500/15"
          aria-label="Alerts"
        >
          <BellRing className="h-3.5 w-3.5" />
          {criticals > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{criticals}</span>}
        </button>

        <div className="hidden items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 py-1 pl-1 pr-2.5 sm:flex">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-[10px] font-bold text-white">DC</div>
          <div className="leading-none">
            <p className="text-[10px] font-semibold text-foreground">District Officer</p>
            <p className="text-[9px] text-muted-foreground">Collector · Level 4</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { setView } = useResQX();
  const { t } = useI18n();
  return (
    <footer className="mt-auto border-t border-emerald-900/40 bg-[#0a1210]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-center sm:flex-row sm:text-left">
        <Brand onClick={() => setView("home")} />
        <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">{t("footer.text")}</p>
        <p className="text-[11px] font-semibold text-emerald-400">{t("footer.motto")}</p>
      </div>
    </footer>
  );
}

export function AppShell() {
  const { view, online, queuedCount, error, refresh, loading, data } = useResQX();
  const { t } = useI18n();
  const [mobileNav, setMobileNav] = useState(false);

  const View = VIEW_COMPONENTS[view] ?? VIEW_COMPONENTS.home;

  if (view === "home") {
    return (
      <div className="min-h-screen flex flex-col">
        {!online && <OfflineBanner count={queuedCount} text={t("offline.banner")} />}
        <View />
        <AiAssistant />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#070d0b] risk-grid-bg">
      {!online && <OfflineBanner count={queuedCount} text={t("offline.banner")} />}

      <div className="flex flex-1">
        {/* desktop sidebar */}
        <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
          <Sidebar />
        </div>

        {/* mobile drawer */}
        {mobileNav && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/70" onClick={() => setMobileNav(false)} />
            <div className="absolute left-0 top-0 h-full">
              <Sidebar onNavigate={() => setMobileNav(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMenu={() => setMobileNav(true)} />

          <main className="mx-auto w-full max-w-[1500px] flex-1 px-3 py-4 sm:px-5 sm:py-6">
            {error && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Data connection failed: {error}</span>
                <button onClick={refresh} className="rounded-lg border border-red-500/40 px-3 py-1 text-xs font-semibold hover:bg-red-500/20">
                  Retry
                </button>
              </div>
            )}
            {loading && !data && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading Maharashtra risk intelligence…
              </div>
            )}
            <View />
          </main>

          <Footer />
        </div>
      </div>

      <AiAssistant />
    </div>
  );
}

function OfflineBanner({ count, text }: { count: number; text: string }) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-orange-500/90 px-4 py-1.5 text-center text-[11px] font-semibold text-black">
      <CloudOff className="h-3.5 w-3.5" /> {text}
      {count > 0 && <span className="rounded-full bg-black/25 px-2 py-0.5">{count} queued</span>}
    </div>
  );
}
