import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapInfra } from "@/lib/server/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.infraItem.findMany();
  return NextResponse.json(rows.map(mapInfra), { headers: { "Cache-Control": "no-store" } });
}
