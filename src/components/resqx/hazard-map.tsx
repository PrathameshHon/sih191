"use client";
// ResQX shared hazard map — real Maharashtra geography on Leaflet
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AlertItem, FieldReport, Habitation, InfraItem, Shelter, SafeSite } from "@/lib/types";
import { RISK_COLORS } from "@/lib/types";

export type MapMetric = "composite" | "flood" | "landslide" | "earthquake" | "cyclone" | "drought";

export interface HazardMapProps {
  habitations?: Habitation[];
  sites?: SafeSite[];
  alerts?: AlertItem[];
  shelters?: Shelter[];
  infrastructure?: InfraItem[];
  reports?: FieldReport[];
  metric?: MapMetric;
  showSites?: boolean;
  showAlerts?: boolean;
  showShelters?: boolean;
  showInfra?: boolean;
  showReports?: boolean;
  showDistrictBlobs?: boolean;
  height?: number | string;
  onSelectHabitation?: (h: Habitation) => void;
  onSelectSite?: (s: SafeSite) => void;
  focusTarget?: { lat: number; lng: number; zoom?: number } | null;
  selectedHabitationId?: string | null;
  selectedSiteId?: string | null;
  routeLine?: [number, number][];
  fit?: "state" | "west";
}

const MAHARASHTRA_BOUNDS: L.LatLngBoundsExpression = [
  [15.5, 72.4],
  [22.3, 80.9],
];

const LABEL_CITIES = new Set(["Dharavi", "Kopargaon", "Shirdi", "Kolhapur City", "Miraj", "Chiplun", "Panchavati", "Nagpur", "Mahad", "Umbraj (Patan)", "Latur City"]);

function scoreOf(h: Habitation, metric: MapMetric): number {
  if (metric === "composite") return h.hazardScore;
  return h.scores[metric];
}

function levelOf(score: number): keyof typeof RISK_COLORS {
  if (score >= 48) return "high";
  if (score >= 32) return "medium";
  if (score >= 16) return "low";
  return "safe";
}

export default function HazardMap(props: HazardMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    blobs: L.LayerGroup;
    habs: L.LayerGroup;
    sites: L.LayerGroup;
    alerts: L.LayerGroup;
    shelters: L.LayerGroup;
    infra: L.LayerGroup;
    reports: L.LayerGroup;
    selection: L.LayerGroup;
    tile: L.TileLayer;
  } | null>(null);

  // init once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [19.4, 75.6],
      zoom: 6,
      minZoom: 5,
      maxZoom: 12,
      zoomControl: true,
      preferCanvas: true,
      attributionControl: true,
      maxBounds: L.latLngBounds([13.5, 69.5], [24.5, 83.5]),
      maxBoundsViscosity: 0.7,
    });
    const tile = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; Esri — Source: Esri, USGS, NOAA | Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 16,
    }).addTo(map);
    const labels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 16,
      opacity: 0.85,
    }).addTo(map);
    map.fitBounds(MAHARASHTRA_BOUNDS);

    layersRef.current = {
      blobs: L.layerGroup().addTo(map),
      habs: L.layerGroup().addTo(map),
      sites: L.layerGroup().addTo(map),
      alerts: L.layerGroup().addTo(map),
      shelters: L.layerGroup().addTo(map),
      infra: L.layerGroup().addTo(map),
      reports: L.layerGroup().addTo(map),
      selection: L.layerGroup().addTo(map),
      tile,
    };
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  // habitations + district blobs
  useEffect(() => {
    const ctx = layersRef.current;
    const map = mapRef.current;
    if (!ctx || !map) return;
    ctx.blobs.clearLayers();
    ctx.habs.clearLayers();

    const habitations = props.habitations ?? [];
    if (props.showDistrictBlobs !== false) {
      const byDistrict = new Map<string, Habitation[]>();
      for (const h of habitations) {
        const arr = byDistrict.get(h.district) ?? [];
        arr.push(h);
        byDistrict.set(h.district, arr);
      }
      for (const [district, members] of byDistrict) {
        const lat = members.reduce((a, m) => a + m.lat, 0) / members.length;
        const lng = members.reduce((a, m) => a + m.lng, 0) / members.length;
        const avg = members.reduce((a, m) => a + scoreOf(m, props.metric ?? "composite"), 0) / members.length;
        const level = levelOf(avg);
        L.circle([lat, lng], {
          radius: 24000 + 2600 * Math.sqrt(members.length),
          color: RISK_COLORS[level],
          weight: 0,
          fillColor: RISK_COLORS[level],
          fillOpacity: 0.14,
          interactive: false,
        }).addTo(ctx.blobs);
        L.marker([lat, lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="font:600 9px var(--font-inter);color:${RISK_COLORS[level]}cc;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;text-shadow:0 1px 6px #000">${district}</div>`,
            iconSize: [0, 0],
          }),
          interactive: false,
        }).addTo(ctx.blobs);
      }
    }

    for (const h of habitations) {
      const score = scoreOf(h, props.metric ?? "composite");
      const color = RISK_COLORS[levelOf(score)];
      const radius = 5 + Math.min(9, Math.sqrt(h.population / 2600));
      const marker = L.circleMarker([h.lat, h.lng], {
        radius,
        color,
        weight: 1.6,
        fillColor: color,
        fillOpacity: 0.55,
      });
      const rankTxt = h.priorityRank <= 10 ? ` · Priority #${h.priorityRank}` : "";
      marker.bindTooltip(
        `<b>${h.name}</b>${rankTxt}<br/>${h.taluka}, ${h.district}<br/>Score ${score.toFixed(0)} · ${h.riskLevel.toUpperCase()} risk · Pop ${h.population.toLocaleString("en-IN")}`,
        { direction: "top", offset: [0, -6] }
      );
      marker.on("click", () => props.onSelectHabitation?.(h));
      if (LABEL_CITIES.has(h.name)) {
        marker.bindTooltip(`<b>${h.name}</b>`, { permanent: true, direction: "right", offset: [8, 0], className: "resqx-city-label" });
      }
      marker.addTo(ctx.habs);
    }
  }, [props.habitations, props.metric, props.showDistrictBlobs, props.onSelectHabitation]);

  // safe sites
  useEffect(() => {
    const ctx = layersRef.current;
    if (!ctx) return;
    ctx.sites.clearLayers();
    if (props.showSites === false) return;
    for (const s of props.sites ?? []) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:15px;height:15px;transform:rotate(45deg);background:rgba(16,185,129,.9);border:2px solid #d1fae5;border-radius:3px;box-shadow:0 0 12px rgba(16,185,129,.8)"></div>`,
        iconSize: [15, 15],
        iconAnchor: [8, 8],
      });
      const marker = L.marker([s.lat, s.lng], { icon });
      marker.bindTooltip(
        `<b>✔ ${s.name}</b><br/>${s.taluka}, ${s.district}<br/>Capacity ${s.capacity.toLocaleString("en-IN")} · Water ${(s.waterIndex * 100).toFixed(0)}% · Infra ${(s.infraIndex * 100).toFixed(0)}%<br/>Occupied ${s.occupied.toLocaleString("en-IN")}`,
        { direction: "top", offset: [0, -8] }
      );
      marker.on("click", () => props.onSelectSite?.(s));
      marker.addTo(ctx.sites);
    }
  }, [props.sites, props.showSites, props.onSelectSite]);

  // alerts
  useEffect(() => {
    const ctx = layersRef.current;
    if (!ctx) return;
    ctx.alerts.clearLayers();
    if (props.showAlerts === false) return;
    const sevColor: Record<string, string> = { critical: "#ef4444", warning: "#f97316", advisory: "#eab308", watch: "#38bdf8" };
    for (const a of props.alerts ?? []) {
      if (a.lat == null || a.lng == null) continue;
      const color = sevColor[a.severity] ?? "#ef4444";
      const pulse = L.marker([a.lat, a.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="position:relative;width:18px;height:18px"><div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:.35;animation:resqx-pulse 1.5s ease-in-out infinite"></div><div style="position:absolute;inset:4px;border-radius:50%;background:${color};border:1.5px solid #fff9"></div></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      });
      pulse.bindTooltip(`<b>[${a.severity.toUpperCase()}] ${a.title}</b><br/>${a.district} · ${a.source}`, { direction: "top", offset: [0, -8] });
      pulse.addTo(ctx.alerts);
    }
  }, [props.alerts, props.showAlerts]);

  // shelters
  useEffect(() => {
    const ctx = layersRef.current;
    if (!ctx) return;
    ctx.shelters.clearLayers();
    if (props.showShelters === false) return;
    for (const s of props.shelters ?? []) {
      const color = s.status === "full" ? "#ef4444" : s.status === "limited" ? "#eab308" : "#10b981";
      const marker = L.marker([s.lat, s.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #0a1210;box-shadow:0 0 8px ${color}"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        }),
      });
      marker.bindTooltip(`<b>🏘 ${s.name}</b><br/>Capacity ${s.capacity} · Occupied ${s.occupancy}<br/>Status: ${s.status.toUpperCase()}`, { direction: "top", offset: [0, -6] });
      marker.addTo(ctx.shelters);
    }
  }, [props.shelters, props.showShelters]);

  // infrastructure
  useEffect(() => {
    const ctx = layersRef.current;
    if (!ctx) return;
    ctx.infra.clearLayers();
    if (props.showInfra === false) return;
    const statusColor: Record<string, string> = { operational: "#10b981", degraded: "#eab308", damaged: "#ef4444", at_risk: "#f97316" };
    for (const i of props.infrastructure ?? []) {
      const color = statusColor[i.status] ?? "#10b981";
      const marker = L.marker([i.lat, i.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:11px;height:11px;background:${color};border:1.5px solid #0a1210;transform:rotate(45deg);box-shadow:0 0 8px ${color}"></div>`,
          iconSize: [11, 11],
          iconAnchor: [6, 6],
        }),
      });
      marker.bindTooltip(`<b>${i.name}</b><br/>${i.type.replace("_", " ")} · ${i.status.toUpperCase()} · Condition ${i.conditionScore}/100`, { direction: "top", offset: [0, -6] });
      marker.addTo(ctx.infra);
    }
  }, [props.infrastructure, props.showInfra]);

  // field reports
  useEffect(() => {
    const ctx = layersRef.current;
    if (!ctx) return;
    ctx.reports.clearLayers();
    if (props.showReports === false) return;
    const sevColor: Record<string, string> = { critical: "#ef4444", warning: "#f97316", advisory: "#eab308" };
    for (const r of props.reports ?? []) {
      const color = sevColor[r.severity] ?? "#f97316";
      const marker = L.marker([r.lat, r.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="width:14px;height:14px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:1.5px solid #0a1210"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 12],
        }),
      });
      marker.bindTooltip(`<b>📋 ${r.place}</b> · ${r.status.toUpperCase()}<br/>${r.hazard} — ${r.description.slice(0, 90)}…`, { direction: "top", offset: [0, -8] });
      marker.addTo(ctx.reports);
    }
  }, [props.reports, props.showReports]);

  // selection highlight + optional dashed route line (habitation → matched site)
  useEffect(() => {
    const ctx = layersRef.current;
    if (!ctx) return;
    ctx.selection.clearLayers();
    const habs = props.habitations ?? [];
    if (props.routeLine && props.routeLine.length === 2) {
      L.polyline(props.routeLine, {
        color: "#6ee7b7",
        weight: 1.6,
        dashArray: "5 6",
        opacity: 0.85,
      }).addTo(ctx.selection);
    }
    if (props.selectedHabitationId) {
      const h = habs.find((x) => x.id === props.selectedHabitationId);
      if (h) {
        L.circleMarker([h.lat, h.lng], {
          radius: 13,
          color: "#d1fae5",
          weight: 2,
          fill: false,
          dashArray: "4 3",
        }).addTo(ctx.selection);
      }
    }
    if (props.selectedSiteId) {
      const s = props.sites?.find((x) => x.id === props.selectedSiteId);
      if (s) {
        L.circleMarker([s.lat, s.lng], {
          radius: 14,
          color: "#fcd34d",
          weight: 2,
          fill: false,
          dashArray: "4 3",
        }).addTo(ctx.selection);
      }
    }
  }, [props.selectedHabitationId, props.selectedSiteId, props.routeLine, props.habitations, props.sites]);

  // focus fly-to
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.focusTarget) return;
    map.flyTo([props.focusTarget.lat, props.focusTarget.lng], props.focusTarget.zoom ?? 9, { duration: 0.9 });
  }, [props.focusTarget]);

  // fit mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (props.fit === "west") {
      map.flyToBounds(
        [
          [15.5, 72.4],
          [21.2, 76.3],
        ],
        { duration: 0.8 }
      );
    } else {
      map.flyToBounds(MAHARASHTRA_BOUNDS, { duration: 0.8 });
    }
  }, [props.fit]);

  return (
    <div
      ref={containerRef}
      style={{ height: typeof props.height === "number" ? `${props.height}px` : props.height ?? "100%", width: "100%" }}
      className="z-0 rounded-xl overflow-hidden border border-emerald-900/30"
      role="application"
      aria-label="Maharashtra multi-hazard risk map"
    />
  );
}
