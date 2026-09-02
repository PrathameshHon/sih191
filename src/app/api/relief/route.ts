import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapRelief } from "@/lib/server/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.reliefProject.findMany();
  return NextResponse.json(rows.map(mapRelief), { headers: { "Cache-Control": "no-store" } });
}
