"use client";
// ResQX global client store — bootstrap data, offline field-mode queue, nav, simulation state
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { BootstrapData, FieldReport, Habitation, MatchResult, SafeSite, SimParams } from "@/lib/types";
import type { ViewId } from "@/lib/nav";
import { DEFAULT_SIM } from "@/lib/engine";

const QUEUE_KEY = "resqx-report-queue";

interface QueuedReport {
  reporterName: string;
  phone?: string;
  hazard: string;
  severity: string;
  description: string;
  lat: number;
  lng: number;
  district: string;
  place: string;
  clientCreatedAt: string;
}

interface ResQXCtx {
  data: BootstrapData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  online: boolean;
  queuedCount: number;
  submitFieldReport: (input: Omit<QueuedReport, "clientCreatedAt">) => Promise<"sent" | "queued">;
  queue: QueuedReport[];
  clearQueue: () => void;
  view: ViewId;
  setView: (v: ViewId) => void;
  sim: SimParams;
  setSim: React.Dispatch<React.SetStateAction<SimParams>>;
  simActive: boolean;
  setSimActive: (v: boolean) => void;
  selectedHabitationId: string | null;
  setSelectedHabitationId: (id: string | null) => void;
  selectedSiteId: string | null;
  setSelectedSiteId: (id: string | null) => void;
  focusTarget: { lat: number; lng: number; zoom?: number } | null;
  focusOn: (lat: number, lng: number, zoom?: number) => void;
  habitationById: Record<string, Habitation>;
  siteById: Record<string, SafeSite>;
  matchFor: (habitationId: string) => MatchResult | undefined;
  siteOf: (habitationId: string) => SafeSite | undefined;
  activeSimHabitaitons: Habitation[] | null;
}

const Ctx = createContext<ResQXCtx | null>(null);

function readQueue(): QueuedReport[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedReport[];
  } catch {
    return [];
  }
}

export function ResQXProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedReport[]>([]);
  const [view, setViewState] = useState<ViewId>("home");
  const [sim, setSim] = useState<SimParams>(DEFAULT_SIM);
  const [simActive, setSimActive] = useState(false);
  const [selectedHabitationId, setSelectedHabitationId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const syncing = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const json = (await res.json()) as BootstrapData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    setOnline(navigator.onLine);
    setQueue(readQueue());
    const hash = window.location.hash.replace(/^#\/?/, "") as ViewId;
    if (hash) setViewState(hash);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [refresh]);

  const setView = useCallback((v: ViewId) => {
    setViewState(v);
    try {
      if (window.location.hash !== `/${v}`) window.location.hash = `/${v}`;
    } catch {}
    window.scrollTo({ top: 0 });
  }, []);

  // deep-link support: respond to manual hash edits / back-forward navigation
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace(/^#\/?/, "") as ViewId;
      setViewState((prev) => (h && h !== prev ? h : prev));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const focusOn = useCallback((lat: number, lng: number, zoom?: number) => {
    setFocusTarget({ lat, lng, zoom });
    // reset after map consumes it
    setTimeout(() => setFocusTarget(null), 1200);
  }, []);

  const syncQueue = useCallback(async () => {
    if (syncing.current) return;
    const q = readQueue();
    if (!q.length || !navigator.onLine) return;
    syncing.current = true;
    const remain: QueuedReport[] = [];
    for (const item of q) {
      try {
        const res = await fetch("/api/field-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (!res.ok) remain.push(item);
      } catch {
        remain.push(item);
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remain));
    setQueue(remain);
    syncing.current = false;
    if (remain.length < q.length) refresh();
  }, [refresh]);

  useEffect(() => {
    if (online) syncQueue();
  }, [online, syncQueue]);

  const submitFieldReport = useCallback(
    async (input: Omit<QueuedReport, "clientCreatedAt">): Promise<"sent" | "queued"> => {
      const payload: QueuedReport = { ...input, clientCreatedAt: new Date().toISOString() };
      if (!navigator.onLine) {
        const q = readQueue();
        q.push(payload);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
        setQueue(q);
        return "queued";
      }
      try {
        const res = await fetch("/api/field-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        await refresh();
        return "sent";
      } catch {
        const q = readQueue();
        q.push(payload);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
        setQueue(q);
        return "queued";
      }
    },
    [refresh]
  );

  const clearQueue = useCallback(() => {
    localStorage.setItem(QUEUE_KEY, "[]");
    setQueue([]);
  }, []);

  const habitationById = useMemo(() => {
    const m: Record<string, Habitation> = {};
    for (const h of data?.habitations ?? []) m[h.id] = h;
    return m;
  }, [data]);

  const siteById = useMemo(() => {
    const m: Record<string, SafeSite> = {};
    for (const s of data?.sites ?? []) m[s.id] = s;
    return m;
  }, [data]);

  const matchFor = useCallback((habitationId: string) => data?.matchById?.[habitationId], [data]);

  const siteOf = useCallback(
    (habitationId: string) => {
      const m = data?.matchById?.[habitationId];
      return m?.siteId ? siteById[m.siteId] : undefined;
    },
    [data, siteById]
  );

  const value: ResQXCtx = {
    data, loading, error, refresh,
    online, queuedCount: queue.length, queue, submitFieldReport, clearQueue,
    view, setView,
    sim, setSim, simActive, setSimActive,
    selectedHabitationId, setSelectedHabitationId,
    selectedSiteId, setSelectedSiteId,
    focusTarget, focusOn,
    habitationById, siteById, matchFor, siteOf,
    activeSimHabitaitons: null,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResQX() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useResQX must be used inside ResQXProvider");
  return ctx;
}

// ---------- voice (Web Speech API) ----------

export function useSpeech() {
  const speak = useCallback((text: string, langCode: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = langCode;
      utter.rate = 1;
      synth.speak(utter);
    } catch {}
  }, []);

  const stop = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {}
  }, []);

  const listen = useCallback(
    (langCode: string, onResult: (text: string) => void, onEnd?: () => void): boolean => {
      try {
        const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
          ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
        if (!SR) return false;
        const rec = new SR();
        rec.lang = langCode;
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.onresult = (e: { results: { 0: { transcript: string } }[] }) => {
          const text = e.results?.[0]?.[0]?.transcript;
          if (text) onResult(text);
        };
        rec.onend = () => onEnd?.();
        rec.onerror = () => onEnd?.();
        rec.start();
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  return { speak, stop, listen };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export type { FieldReport };
