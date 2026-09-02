// ResQX risk engine — single source of truth for hazard math.
// Used by: scripts/seed.ts (server), /api routes, and client-side what-if simulation.
import type {
  Habitation,
  HazardKey,
  HazardScores,
  MatchResult,
  RiskLevel,
  SafeSite,
  SimParams,
  SimResult,
} from "./types";

export const HAZARD_WEIGHTS: Record<HazardKey, number> = {
  flood: 0.32,
  landslide: 0.22,
  drought: 0.16,
  earthquake: 0.16,
  cyclone: 0.14,
};

export const ZONE_THRESHOLDS = { high: 48, medium: 32, low: 16 } as const;

export function zoneFor(composite: number): RiskLevel {
  if (composite >= ZONE_THRESHOLDS.high) return "high";
  if (composite >= ZONE_THRESHOLDS.medium) return "medium";
  if (composite >= ZONE_THRESHOLDS.low) return "low";
  return "safe";
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

// ---------- baseline scoring (seed time) ----------

export function applyLocalModifiers(base: HazardScores, h: {
  riverDistKm: number; slopeDeg: number; coastDistKm: number; faultDistKm: number; elevationM: number;
}): HazardScores {
  // flood: proximity to river + low elevation
  const riverMod =
    h.riverDistKm <= 1 ? 1.18 : h.riverDistKm <= 3 ? 1.08 : h.riverDistKm <= 8 ? 0.95 : h.riverDistKm <= 15 ? 0.78 : 0.6;
  const elevMod = h.elevationM < 30 ? 1.1 : h.elevationM < 150 ? 1.02 : h.elevationM < 450 ? 0.95 : 0.88;
  const flood = clamp(base.flood * riverMod * elevMod);

  // landslide: slope driven
  const slopeMod = h.slopeDeg >= 25 ? 1.18 : h.slopeDeg >= 15 ? 1.0 : h.slopeDeg >= 8 ? 0.8 : h.slopeDeg >= 4 ? 0.55 : 0.3;
  const landslide = clamp(base.landslide * slopeMod);

  // earthquake: distance to known fault / seismic belt
  const faultMod = h.faultDistKm <= 25 ? 1.18 : h.faultDistKm <= 60 ? 1.0 : h.faultDistKm <= 120 ? 0.85 : 0.68;
  const earthquake = clamp(base.earthquake * faultMod);

  // cyclone: coastal exposure
  const coastMod = h.coastDistKm <= 15 ? 1.22 : h.coastDistKm <= 50 ? 1.0 : h.coastDistKm <= 120 ? 0.68 : 0.32;
  const cyclone = clamp(base.cyclone * coastMod);

  const drought = clamp(base.drought);
  return { flood, landslide, earthquake, cyclone, drought };
}

export function compositeScore(s: HazardScores): number {
  return (
    s.flood * HAZARD_WEIGHTS.flood +
    s.landslide * HAZARD_WEIGHTS.landslide +
    s.drought * HAZARD_WEIGHTS.drought +
    s.earthquake * HAZARD_WEIGHTS.earthquake +
    s.cyclone * HAZARD_WEIGHTS.cyclone
  );
}

export function vulnerabilityIndex(h: {
  kutchaPct: number; scstPct: number; literacyPct: number; infraAccess: number; population: number;
}): number {
  const v =
    0.32 * (h.kutchaPct / 100) +
    0.22 * (h.scstPct / 100) +
    0.18 * (1 - h.literacyPct / 100) +
    0.16 * (1 - h.infraAccess) +
    0.12 * Math.min(h.population / 150000, 1);
  // calibrate to full 0..1 band (raw composite of real settlements peaks ~0.47)
  const scaled = Math.min(0.98, v * 1.55);
  return Math.round(Math.max(0.02, scaled) * 100) / 100;
}

export function urgencyIndex(hazardScore: number, vulnerability: number): number {
  return Math.round((0.55 * (hazardScore / 100) + 0.45 * vulnerability) * 100) / 100;
}

export function populationAtRisk(population: number, hazardScore: number): number {
  const factor = hazardScore >= 65 ? 0.85 : hazardScore >= 45 ? 0.6 : hazardScore >= 25 ? 0.32 : 0.1;
  return Math.round(population * factor);
}

// ---------- carrying capacity ----------

export const PERSONS_PER_HA: Record<string, number> = {
  barren: 60,
  government: 75,
  pasture: 30,
  farmland: 25,
  plateau: 45,
};

export function computeCapacity(landHa: number, landUse: string, waterIndex: number, infraIndex: number): number {
  const landCap = landHa * (PERSONS_PER_HA[landUse] ?? 40);
  const waterCap = landHa * 250 * waterIndex;
  const infraCap = landHa * 280 * infraIndex;
  return Math.round(Math.min(landCap, waterCap, infraCap) / 100) * 100;
}

// ---------- matching (greedy by urgency) ----------

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)) * 10) / 10;
}

export function suitability(h: Habitation, s: SafeSite): number {
  const dist = haversineKm(h, s);
  let score = 100 - dist * 1.1 - (h.district === s.district ? 0 : 18);
  score += s.waterIndex * 12 + s.infraIndex * 12;
  // penalize siting people into still-yellowish zones
  return Math.round(Math.max(0, Math.min(100, score)));
}

export interface MatchableHabitation extends Habitation { recommendedSiteId?: string | null; matchDistanceKm?: number | null }

export const IN_SITU_POP_THRESHOLD = 60000; // large urban wards get in-situ mitigation, not relocation

export function runMatching(
  habitations: Habitation[],
  sites: SafeSite[]
): { matches: MatchResult[]; sites: SafeSite[]; habitationOverrides: Map<string, { siteId: string | null; distanceKm: number | null; suitability: number }> } {
  const sorted = [...habitations].sort((a, b) => b.urgency - a.urgency);
  const remaining = new Map<string, number>(sites.map((s) => [s.id, s.capacity]));
  const matches: MatchResult[] = [];
  const overrides = new Map<string, { siteId: string | null; distanceKm: number | null; suitability: number }>();

  for (const h of sorted) {
    // Metropolitan wards are mitigated in-situ (drainage, flood-proofing) — relocation applies to settlements
    if (h.population > IN_SITU_POP_THRESHOLD) {
      matches.push({ habitationId: h.id, siteId: null, distanceKm: null, status: "in_situ", assignedPop: 0 });
      overrides.set(h.id, { siteId: null, distanceKm: null, suitability: 0 });
      continue;
    }
    const viable = sites
      .map((s) => ({ s, dist: haversineKm(h, s), fit: suitability(h, s), rem: remaining.get(s.id) ?? 0 }))
      .filter(({ s, dist, rem }) => rem > 0 && dist <= 130)
      .sort((a, b) => b.fit - a.fit);
    const best = viable[0];
    if (best) {
      const assign = Math.min(h.population, best.rem);
      remaining.set(best.s.id, best.rem - assign);
      const status: MatchResult["status"] = assign >= h.population * 0.9 ? "matched" : "partial";
      matches.push({ habitationId: h.id, siteId: best.s.id, distanceKm: best.dist, status, assignedPop: assign });
      overrides.set(h.id, { siteId: best.s.id, distanceKm: best.dist, suitability: best.fit });
    } else {
      matches.push({ habitationId: h.id, siteId: null, distanceKm: null, status: "no_site", assignedPop: 0 });
      overrides.set(h.id, { siteId: null, distanceKm: null, suitability: 0 });
    }
  }

  const updatedSites = sites.map((s) => ({ ...s, occupied: s.capacity - (remaining.get(s.id) ?? 0) }));
  return { matches, sites: updatedSites, habitationOverrides: overrides };
}

// ---------- what-if simulation ----------

export function simulateScores(s: HazardScores, h: { riverDistKm: number; coastDistKm: number; faultDistKm: number }, p: SimParams): HazardScores {
  const flood =
    s.flood * (1 + 2.4 * (p.rainfallPct / 100)) + p.riverRiseM * 4.6 * (1 / (1 + h.riverDistKm / 3));
  const landslide = s.landslide * (1 + 1.6 * (Math.max(0, p.rainfallPct) / 100));
  const quakeProx = Math.max(0, 1 - h.faultDistKm / 150);
  const quake = Math.max(s.earthquake, ((p.quakeMag - 3.2) / 3.6) * 100 * (0.4 + 0.6 * quakeProx));
  const coastMod = h.coastDistKm <= 50 ? 1 : h.coastDistKm <= 120 ? 0.7 : 0.3;
  const cyclone = s.cyclone * (1 + (p.cyclonePct / 100)) * coastMod;
  const drought = s.drought * (1 + p.droughtPct / 100);
  return {
    flood: clamp(flood),
    landslide: clamp(landslide),
    earthquake: clamp(quake),
    cyclone: clamp(cyclone),
    drought: clamp(drought),
  };
}

export function runSimulation(habs: Habitation[], p: SimParams): SimResult {
  const habitations = habs.map((h) => {
    const scores = simulateScores(h.scores, h, p);
    const hazardScore = compositeScore(scores);
    const riskLevel = zoneFor(hazardScore);
    return {
      ...h,
      scores,
      hazardScore,
      riskLevel,
      urgency: urgencyIndex(hazardScore, h.vulnerability),
      populationAtRisk: populationAtRisk(h.population, hazardScore),
      baseline: { hazardScore: h.hazardScore, riskLevel: h.riskLevel },
    };
  });

  const highBefore = habitations.filter((h) => h.baseline.riskLevel === "high").length;
  const highAfter = habitations.filter((h) => h.riskLevel === "high").length;
  const popHighBefore = habitations.filter((h) => h.baseline.riskLevel === "high").reduce((a, h) => a + h.population, 0);
  const popHighAfter = habitations.filter((h) => h.riskLevel === "high").reduce((a, h) => a + h.population, 0);

  const byDistrict = new Map<string, number>();
  for (const h of habitations) {
    const delta = h.hazardScore - h.baseline.hazardScore;
    byDistrict.set(h.district, (byDistrict.get(h.district) ?? 0) + delta);
  }
  const worstDistrict = [...byDistrict.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return {
    habitations,
    summary: {
      highBefore,
      highAfter,
      popHighBefore,
      popHighAfter,
      displacement: Math.max(0, popHighAfter - popHighBefore),
      worstDistrict,
    },
  };
}

export const DEFAULT_SIM: SimParams = {
  rainfallPct: 0,
  riverRiseM: 0,
  quakeMag: 3,
  cyclonePct: 0,
  droughtPct: 0,
};
