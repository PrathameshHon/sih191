import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapHabitation, mapSite } from "@/lib/server/data";
import { runMatching, HAZARD_WEIGHTS, ZONE_THRESHOLDS, PERSONS_PER_HA } from "@/lib/engine";
import { areaFor } from "@/lib/static-data";
import type { Habitation } from "@/lib/types";

export const dynamic = "force-dynamic";

export type GovReportType = "red-zone" | "relocation-plan" | "district-summary" | "capacity" | "executive";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const type: GovReportType = body?.type ?? "executive";
  const district: string | "ALL" = body?.district ?? "ALL";

  const [habRows, siteRows] = await Promise.all([db.habitation.findMany(), db.safeSite.findMany()]);
  const habitations = habRows.map(mapHabitation).sort((a, b) => a.priorityRank - b.priorityRank);
  const sites = siteRows.map(mapSite);
  const { matches } = runMatching(habitations, sites);
  const matchById: Record<string, (typeof matches)[number]> = {};
  for (const m of matches) matchById[m.habitationId] = m;

  const scoped: Habitation[] = district === "ALL" ? habitations : habitations.filter((h) => h.district === district);
  const scopedSites = district === "ALL" ? sites : sites.filter((s) => s.district === district);
  const high = scoped.filter((h) => h.riskLevel === "high");
  const popAtRisk = scoped.reduce((a, h) => a + h.populationAtRisk, 0);
  const totalPop = scoped.reduce((a, h) => a + h.population, 0);
  const capacity = scopedSites.reduce((a, s) => a + s.capacity, 0);
  const now = new Date();
  const reportId = `ResQX/${type.toUpperCase().slice(0, 4)}/${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}/${Math.floor(Math.random() * 900 + 100)}`;

  const header = {
    title: district === "ALL" ? "State Multi-Hazard Status Report" : `${district} District Multi-Hazard Report`,
    reportId,
    generatedAt: now.toISOString(),
    scope: district,
    preparedBy: "ResQX Decision Support System — Disaster Management Unit",
    classification: "For Official Use",
  };

  const kpis = [
    { label: "Habitations in scope", value: scoped.length.toLocaleString("en-IN") },
    { label: "Total population", value: totalPop.toLocaleString("en-IN") },
    { label: "High-risk (Red Zone) habitations", value: high.length.toLocaleString("en-IN") },
    { label: "Population at risk", value: popAtRisk.toLocaleString("en-IN") },
    { label: "Safe relocation capacity", value: capacity.toLocaleString("en-IN") },
    { label: "Relocation planned (persons)", value: matches.filter((m) => m.status === "matched" || m.status === "partial").reduce((a, m) => a + m.assignedPop, 0).toLocaleString("en-IN") },
  ];

  const weightsTxt = Object.entries(HAZARD_WEIGHTS).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(", ");

  const sections: { heading: string; lines: string[] }[] = [];

  sections.push({
    heading: "1. Executive Summary",
    lines: [
      `This report covers ${scoped.length} surveyed habitations${district === "ALL" ? " across Maharashtra" : ` in ${district} district`} with a combined population of ${totalPop.toLocaleString("en-IN")}.`,
      `${high.length} habitations fall in the High-Risk (Red) Zone under the ResQX weighted multi-hazard model (thresholds: Red ≥ ${ZONE_THRESHOLDS.high}, Orange ≥ ${ZONE_THRESHOLDS.medium}, Yellow ≥ ${ZONE_THRESHOLDS.low}).`,
      `Estimated population requiring prioritized relocation/mitigation: ${popAtRisk.toLocaleString("en-IN")} (hazard-exposure weighted).`,
      district === "Ahilyanagar" || district === "ALL"
        ? "Special attention: Ahilyanagar district (Shirdi–Kopargaon corridor) — Godavari flood exposure in Rahata/Kopargaon blocks combined with chronic drought in Pathardi–Jamkhed belt."
        : "",
    ].filter(Boolean),
  });

  sections.push({
    heading: "2. Methodology (AI Hazard Scoring)",
    lines: [
      "Composite hazard score = weighted sum of five normalized hazard layers:",
      `Weights: ${weightsTxt}.`,
      "Flood layer: river proximity (IMD/CWC gauges), elevation; Landslide: slope & Western Ghats escarpment exposure; Earthquake: distance to Killari (1993) & Koyna-Warna seismic belts; Cyclone: coastal distance (Nisarga 2020 track); Drought: GSDA groundwater & rainfall-shadow classification.",
      "Vulnerability Index = kachcha housing share, SC/ST share, literacy deficit, infrastructure access, settlement size (Census 2011 / SECC framework).",
      "Relocation Urgency = 0.55 × hazard exposure + 0.45 × social vulnerability. Carrying capacity from land availability, land-use type, water index & infrastructure index.",
    ],
  });

  sections.push({
    heading: "3. Top Priority Relocation Recommendations",
    lines: scoped.slice(0, 12).map((h) => {
      const m = matchById[h.id];
      const site = m?.siteId ? sites.find((s) => s.id === m.siteId) : null;
      const status = m?.status === "matched" ? "FULL MATCH" : m?.status === "partial" ? `PHASED (${m.assignedPop.toLocaleString("en-IN")} persons phase-1)` : m?.status === "in_situ" ? "IN-SITU MITIGATION" : "NO SITE — CAPACITY GAP";
      return `Rank ${h.priorityRank}: ${h.name} (${h.taluka}, ${h.district}) — Hazard ${h.hazardScore}, Vulnerability ${h.vulnerability}, Urgency ${h.urgency}, Population ${h.population.toLocaleString("en-IN")}. Recommendation: ${status}${site ? ` → ${site.name}, ${site.taluka} (${m?.distanceKm} km, suitability ${m && "suitability" in matchById ? "" : ""}${Math.round(Math.max(0, 100 - (m?.distanceKm ?? 0) * 1.1))}/100)` : ""}.`;
    }),
  });

  sections.push({
    heading: "4. Capacity & Gap Statement",
    lines: [
      `${scopedSites.length} candidate safe sites assessed; sustainable carrying capacity ${capacity.toLocaleString("en-IN")} persons (min of land, water, infrastructure constraints).`,
      `Capacity utilization after priority matching: ${capacity ? Math.round((matches.reduce((a, m) => a + m.assignedPop, 0) / capacity) * 100) : 0}%.`,
      `Sites with remaining headroom: ${scopedSites.filter((s) => s.capacity - s.occupied > 1000).length}. Unmatched habitations (capacity gap): ${matches.filter((m) => m.status === "no_site").length} — recommend Phase-2 land acquisition.`,
      `Capacity model: persons/ha by land-use — ${Object.entries(PERSONS_PER_HA).map(([k, v]) => `${k} ${v}`).join(", ")}; constrained by water availability and infrastructure indices.`,
    ],
  });

  sections.push({
    heading: "5. Recommended Actions",
    lines: [
      "a) Issue evacuation-preparedness notices to all Red-Zone habitations listed in Section 3 before monsoon peak (June–September).",
      "b) Converge PMAY-G + state relocation package for full-match habitations; begin household verification within 30 days.",
      "c) For in-situ metropolitan wards: fund storm-water drainage and riverbank slum redevelopment (BMC/PMC flood-mitigation Cell).",
      "d) Operationalize shelters listed in ResQX Infrastructure module; pre-position SDRF boats at Godavari/Krishna/Panchganga ghats.",
      "e) Enrol all adults in PMSBY (₹20/yr) and farmers in PMFBY before seasonal cut-off; NDRF/SDRF ex-gratia norms to be applied for verified losses.",
      "f) Update DDMP (District Disaster Management Plan) annexures using this report's priority table.",
    ],
  });

  const lulc = district === "ALL" ? null : areaFor(district)?.lulc ?? null;
  if (lulc) {
    sections.push({
      heading: "6. Satellite Land-Use Note",
      lines: [
        `Built-up change 2020→2025: ${lulc.built2020}% → ${lulc.built2025}% (${(lulc.built2025 - lulc.built2020 >= 0 ? "+" : "")}${(lulc.built2025 - lulc.built2020).toFixed(1)} pp).`,
        `Forest ${lulc.forest}%, Agriculture ${lulc.agriculture}%, Water ${lulc.water}%. Riverbed/floodplain encroachment flagged: ${lulc.encroachKm} km (Sentinel-2 change detection).`,
      ],
    });
  }

  return NextResponse.json({ header, kpis, sections });
}
