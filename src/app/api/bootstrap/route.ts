import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runMatching } from "@/lib/engine";
import { areaFor } from "@/lib/static-data";
import { mapHabitation, mapSite, mapAlert, mapShelter, mapInfra, mapRelief, mapReport } from "@/lib/server/data";
import type { AnalyticsData, BootstrapData, RiskLevel } from "@/lib/types";
import { HAZARD_WEIGHTS } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const [habRows, siteRows, alertRows, shelterRows, infraRows, reliefRows, reportRows] = await Promise.all([
    db.habitation.findMany(),
    db.safeSite.findMany(),
    db.alert.findMany({ orderBy: { issuedAt: "desc" } }),
    db.shelter.findMany(),
    db.infraItem.findMany(),
    db.reliefProject.findMany(),
    db.fieldReport.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const habitations = habRows.map(mapHabitation).sort((a, b) => a.priorityRank - b.priorityRank);
  const baseSites = siteRows.map((s) => mapSite(s));
  const { matches, sites, habitationOverrides } = runMatching(habitations, baseSites);

  const matchById: Record<string, (typeof matches)[number]> = {};
  for (const m of matches) matchById[m.habitationId] = m;

  // ---------- analytics ----------
  const zoneStats = (["high", "medium", "low", "safe"] as RiskLevel[]).map((level) => {
    const hs = habitations.filter((h) => h.riskLevel === level);
    return { level, habitations: hs.length, population: hs.reduce((a, h) => a + h.population, 0) };
  });

  const hazardPopulation = (["flood", "landslide", "earthquake", "cyclone", "drought"] as const).map((hz) => {
    let high = 0, medium = 0, low = 0;
    for (const h of habitations) {
      const s = h.scores[hz];
      if (s >= 65) high += h.population;
      else if (s >= 45) medium += h.population;
      else low += h.population;
    }
    return { hazard: hz, high, medium, low };
  });

  const districtMap = new Map<string, { hazardScore: number; population: number; habitations: number; atRisk: number }>();
  for (const h of habitations) {
    const d = districtMap.get(h.district) ?? { hazardScore: 0, population: 0, habitations: 0, atRisk: 0 };
    d.hazardScore += h.hazardScore;
    d.population += h.population;
    d.habitations += 1;
    d.atRisk += h.populationAtRisk;
    districtMap.set(h.district, d);
  }
  const districtRisk = [...districtMap.entries()]
    .map(([district, d]) => {
      const avg = Math.round((d.hazardScore / d.habitations) * 10) / 10;
      const level: RiskLevel = avg >= 48 ? "high" : avg >= 32 ? "medium" : avg >= 16 ? "low" : "safe";
      return { district, hazardScore: avg, riskLevel: level, population: d.population, habitations: d.habitations, atRisk: d.atRisk, areaKm2: areaFor(district)?.areaKm2 ?? 0 };
    })
    .sort((a, b) => b.hazardScore - a.hazardScore);

  const buckets = [
    { bucket: "0 – 0.25", count: 0 }, { bucket: "0.25 – 0.50", count: 0 },
    { bucket: "0.50 – 0.75", count: 0 }, { bucket: "0.75 – 1.00", count: 0 },
  ];
  for (const h of habitations) {
    if (h.vulnerability < 0.25) buckets[0].count++;
    else if (h.vulnerability < 0.5) buckets[1].count++;
    else if (h.vulnerability < 0.75) buckets[2].count++;
    else buckets[3].count++;
  }

  const totalCapacity = sites.reduce((a, s) => a + s.capacity, 0);
  const totalOccupied = sites.reduce((a, s) => a + s.occupied, 0);
  const matched = matches.filter((m) => m.status === "matched" || m.status === "partial").length;
  const analytics: AnalyticsData = {
    totals: {
      habitations: habitations.length,
      districts: districtMap.size,
      population: habitations.reduce((a, h) => a + h.population, 0),
      populationAtRisk: habitations.reduce((a, h) => a + h.populationAtRisk, 0),
      highRiskHabitations: zoneStats[0].habitations,
      safeSites: sites.length,
      totalCapacity,
      matched,
      unmatched: matches.filter((m) => m.status === "no_site").length,
      capacityUtilization: totalCapacity ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
      avgUrgency: habitations.length ? Math.round((habitations.reduce((a, h) => a + h.urgency, 0) / habitations.length) * 100) / 100 : 0,
    },
    zoneStats,
    hazardPopulation,
    districtRisk,
    topVulnerable: habitations.slice(0, 10),
    vulnerabilityBuckets: buckets,
    reliefSummary: {
      budgetCr: Math.round(reliefRows.reduce((a, r) => a + r.budgetCr, 0) * 10) / 10,
      spentCr: Math.round(reliefRows.reduce((a, r) => a + r.spentCr, 0) * 10) / 10,
      projects: reliefRows.length,
      beneficiaries: reliefRows.reduce((a, r) => a + r.beneficiaries, 0),
    },
  };

  const payload: BootstrapData = {
    habitations,
    sites,
    matches,
    matchById,
    alerts: alertRows.map(mapAlert),
    analytics,
    shelters: shelterRows.map(mapShelter),
    infrastructure: infraRows.map(mapInfra),
    reliefProjects: reliefRows.map(mapRelief),
    fieldReports: reportRows.map(mapReport),
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
