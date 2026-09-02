import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runSimulation } from "@/lib/engine";
import { mapHabitation } from "@/lib/server/data";
import type { SimParams } from "@/lib/types";

export const dynamic = "force-dynamic";

const clampNum = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (Number.isNaN(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Partial<SimParams>;
  const params: SimParams = {
    rainfallPct: clampNum(body.rainfallPct, -30, 80, 0),
    riverRiseM: clampNum(body.riverRiseM, 0, 6, 0),
    quakeMag: clampNum(body.quakeMag, 3, 7, 3),
    cyclonePct: clampNum(body.cyclonePct, 0, 60, 0),
    droughtPct: clampNum(body.droughtPct, -50, 50, 0),
  };
  const rows = await db.habitation.findMany();
  const habitations = rows.map(mapHabitation);
  const result = runSimulation(habitations, params);
  return NextResponse.json({ params, ...result }, { headers: { "Cache-Control": "no-store" } });
}
