// ResQX — shared contracts (frozen). Backend seed, APIs and frontend views
// must all build against these exact shapes.

export type RiskLevel = "high" | "medium" | "low" | "safe";
export type HazardKey = "flood" | "landslide" | "earthquake" | "cyclone" | "drought";

export interface HazardScores {
  flood: number;
  landslide: number;
  earthquake: number;
  cyclone: number;
  drought: number;
}

export interface Habitation {
  id: string;
  name: string;
  district: string;
  taluka: string;
  lat: number;
  lng: number;
  population: number;
  households: number;
  kutchaPct: number;
  scstPct: number;
  literacyPct: number;
  elevationM: number;
  slopeDeg: number;
  riverDistKm: number;
  coastDistKm: number;
  faultDistKm: number;
  scores: HazardScores; // 0..100 per hazard
  hazardScore: number; // weighted composite 0..100
  vulnerability: number; // 0..1
  urgency: number; // 0..1
  riskLevel: RiskLevel;
  priorityRank: number; // 1 = most urgent
  populationAtRisk: number;
  protectionScore: number; // 0..100 insurance/awareness coverage
  waterSource: string;
  infraAccess: number; // 0..1
  events: string[]; // historical disaster events (real references)
}

export interface SafeSite {
  id: string;
  name: string;
  district: string;
  taluka: string;
  lat: number;
  lng: number;
  landHa: number;
  landUse: string;
  waterIndex: number; // 0..1
  infraIndex: number; // 0..1
  connectivityKm: number;
  capacity: number; // sustainable persons
  amenities: string[];
  occupied: number; // persons assigned by matching
  suitability: number; // 0..100 for the current matching
}

export interface MatchResult {
  habitationId: string;
  siteId: string | null;
  distanceKm: number | null;
  status: "matched" | "partial" | "no_site" | "in_situ";
  assignedPop: number; // persons planned for relocation at the matched site
}

export type AlertSeverity = "critical" | "warning" | "advisory" | "watch";

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  hazard: HazardKey;
  district: string;
  lat: number | null;
  lng: number | null;
  issuedAt: string;
  validUntil: string;
  source: string;
  active: boolean;
  instructions: string;
}

export interface FieldReport {
  id: string;
  reporterName: string;
  phone: string | null;
  hazard: HazardKey;
  severity: "critical" | "warning" | "advisory";
  description: string;
  lat: number;
  lng: number;
  district: string;
  place: string;
  status: "pending" | "verified" | "resolved";
  createdAt: string;
}

export interface Shelter {
  id: string;
  name: string;
  type: "school" | "community_hall" | "cyclone_shelter" | "camp";
  district: string;
  lat: number;
  lng: number;
  capacity: number;
  occupancy: number;
  facilities: string[];
  contact: string;
  status: "available" | "limited" | "full";
}

export type InfraType =
  | "hospital"
  | "fire_station"
  | "ambulance"
  | "water"
  | "road"
  | "bridge"
  | "dam"
  | "power";

export interface InfraItem {
  id: string;
  name: string;
  type: InfraType;
  district: string;
  lat: number;
  lng: number;
  status: "operational" | "degraded" | "damaged" | "at_risk";
  conditionScore: number; // 0..100
  lastAudit: string;
  note: string;
}

export interface ReliefProject {
  id: string;
  name: string;
  district: string;
  category: "compensation" | "housing" | "infrastructure" | "livelihood";
  budgetCr: number;
  spentCr: number;
  beneficiaries: number;
  progressPct: number;
  status: "completed" | "ongoing" | "delayed" | "tendered";
  timeline: string;
  agency: string;
}

export interface Scheme {
  id: string;
  name: string;
  nameHi: string;
  nameMr: string;
  ministry: string;
  category: string;
  description: string;
  benefits: string[];
  eligibility: string[];
}

export interface SimParams {
  rainfallPct: number; // -30..+80 % delta on monsoon rainfall
  riverRiseM: number; // 0..6 m rise
  quakeMag: number; // 3..7 M scenario
  cyclonePct: number; // 0..+60 % intensity delta
  droughtPct: number; // -50..+50 % delta
}

export interface DistrictArea {
  district: string;
  areaKm2: number;
  lulc: {
    built2020: number; // % built-up 2020
    built2025: number;
    forest: number;
    agriculture: number;
    water: number;
    barren: number;
    encroachKm: number; // riverbed encroachment (km)
  };
}

export interface ZoneStat {
  level: RiskLevel;
  habitations: number;
  population: number;
}

export interface AnalyticsData {
  totals: {
    habitations: number;
    districts: number;
    population: number;
    populationAtRisk: number;
    highRiskHabitations: number;
    safeSites: number;
    totalCapacity: number;
    matched: number;
    unmatched: number;
    capacityUtilization: number;
    avgUrgency: number;
  };
  zoneStats: ZoneStat[];
  hazardPopulation: { hazard: string; high: number; medium: number; low: number }[];
  districtRisk: {
    district: string;
    hazardScore: number;
    riskLevel: RiskLevel;
    population: number;
    habitations: number;
    atRisk: number;
    areaKm2: number;
  }[];
  topVulnerable: Habitation[];
  vulnerabilityBuckets: { bucket: string; count: number }[];
  reliefSummary: { budgetCr: number; spentCr: number; projects: number; beneficiaries: number };
}

export interface BootstrapData {
  habitations: Habitation[];
  sites: SafeSite[];
  matches: MatchResult[];
  matchById: Record<string, MatchResult>;
  alerts: AlertItem[];
  analytics: AnalyticsData;
  shelters: Shelter[];
  infrastructure: InfraItem[];
  reliefProjects: ReliefProject[];
  fieldReports: FieldReport[];
}

export interface SimResult {
  habitations: (Habitation & { baseline: { hazardScore: number; riskLevel: RiskLevel } })[];
  summary: {
    highBefore: number;
    highAfter: number;
    popHighBefore: number;
    popHighAfter: number;
    displacement: number; // additional people in high-risk after sim
    worstDistrict: string;
  };
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#eab308",
  safe: "#10b981",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  high: "High Risk (Red Zone)",
  medium: "Medium Risk (Orange)",
  low: "Low Risk (Yellow)",
  safe: "Safe Zone (Green)",
};
