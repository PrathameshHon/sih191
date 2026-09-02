import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapAlert } from "@/lib/server/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.alert.findMany({ orderBy: { issuedAt: "desc" } });
  return NextResponse.json(rows.map(mapAlert), { headers: { "Cache-Control": "no-store" } });
}
