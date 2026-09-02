// Server-side DTO mappers shared by API routes
import { populationAtRisk } from "@/lib/engine";
import type { AlertItem, FieldReport, Habitation, InfraItem, ReliefProject, SafeSite, Shelter } from "@/lib/types";

type HabRow = {
  id: string; name: string; district: string; taluka: string; lat: number; lng: number;
  population: number; households: number; kutchaPct: number; scstPct: number; literacyPct: number;
  elevationM: number; slopeDeg: number; riverDistKm: number; coastDistKm: number; faultDistKm: number;
  flood: number; landslide: number; earthquake: number; cyclone: number; drought: number;
  hazardScore: number; vulnerability: number; urgency: number; riskLevel: string; priorityRank: number;
  protectionScore: number; waterSource: string; infraAccess: number; events: string;
};

export function mapHabitation(h: HabRow): Habitation {
  return {
    id: h.id, name: h.name, district: h.district, taluka: h.taluka, lat: h.lat, lng: h.lng,
    population: h.population, households: h.households,
    kutchaPct: h.kutchaPct, scstPct: h.scstPct, literacyPct: h.literacyPct,
    elevationM: h.elevationM, slopeDeg: h.slopeDeg, riverDistKm: h.riverDistKm, coastDistKm: h.coastDistKm, faultDistKm: h.faultDistKm,
    scores: { flood: h.flood, landslide: h.landslide, earthquake: h.earthquake, cyclone: h.cyclone, drought: h.drought },
    hazardScore: h.hazardScore, vulnerability: h.vulnerability, urgency: h.urgency,
    riskLevel: h.riskLevel as Habitation["riskLevel"], priorityRank: h.priorityRank,
    populationAtRisk: populationAtRisk(h.population, h.hazardScore),
    protectionScore: h.protectionScore, waterSource: h.waterSource, infraAccess: h.infraAccess,
    events: safeParse(h.events, []),
  };
}

export function mapSite(s: { id: string; name: string; district: string; taluka: string; lat: number; lng: number; landHa: number; landUse: string; waterIndex: number; infraIndex: number; connectivityKm: number; capacity: number; amenities: string; occupied?: number }): SafeSite {
  return {
    id: s.id, name: s.name, district: s.district, taluka: s.taluka, lat: s.lat, lng: s.lng,
    landHa: s.landHa, landUse: s.landUse, waterIndex: s.waterIndex, infraIndex: s.infraIndex,
    connectivityKm: s.connectivityKm, capacity: s.capacity, amenities: safeParse(s.amenities, []),
    occupied: s.occupied ?? 0, suitability: 0,
  };
}

export function mapAlert(a: { id: string; title: string; message: string; severity: string; hazard: string; district: string; lat: number | null; lng: number | null; issuedAt: string; validUntil: string; source: string; active: boolean; instructions: string }): AlertItem {
  return { ...a, severity: a.severity as AlertItem["severity"], hazard: a.hazard as AlertItem["hazard"] };
}

export function mapReport(r: { id: string; reporterName: string; phone: string | null; hazard: string; severity: string; description: string; lat: number; lng: number; district: string; place: string; status: string; createdAt: string }): FieldReport {
  return { ...r, hazard: r.hazard as FieldReport["hazard"], severity: r.severity as FieldReport["severity"], status: r.status as FieldReport["status"] };
}

export function mapShelter(s: { id: string; name: string; type: string; district: string; lat: number; lng: number; capacity: number; occupancy: number; facilities: string; contact: string; status: string }): Shelter {
  return { ...s, type: s.type as Shelter["type"], facilities: safeParse(s.facilities, []), status: s.status as Shelter["status"] };
}

export function mapInfra(i: { id: string; name: string; type: string; district: string; lat: number; lng: number; status: string; conditionScore: number; lastAudit: string; note: string }): InfraItem {
  return { ...i, type: i.type as InfraItem["type"], status: i.status as InfraItem["status"] };
}

export function mapRelief(p: { id: string; name: string; district: string; category: string; budgetCr: number; spentCr: number; beneficiaries: number; progressPct: number; status: string; timeline: string; agency: string }): ReliefProject {
  return { ...p, category: p.category as ReliefProject["category"], status: p.status as ReliefProject["status"] };
}

export function safeParse<T>(json: string | null | undefined, fallback: T): T {
  try {
    return json ? (JSON.parse(json) as T) : fallback;
  } catch {
    return fallback;
  }
}
