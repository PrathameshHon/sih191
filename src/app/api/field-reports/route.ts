import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapReport } from "@/lib/server/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.fieldReport.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(rows.map(mapReport), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.reporterName || !body.hazard || !body.description || typeof body.lat !== "number" || typeof body.lng !== "number") {
    return NextResponse.json({ error: "reporterName, hazard, description, lat, lng are required" }, { status: 400 });
  }
  const count = await db.fieldReport.count();
  const created = await db.fieldReport.create({
    data: {
      id: `FR${String(count + 100).padStart(3, "0")}-${Date.now().toString(36)}`,
      reporterName: String(body.reporterName).slice(0, 80),
      phone: body.phone ? String(body.phone).slice(0, 20) : null,
      hazard: String(body.hazard),
      severity: String(body.severity ?? "warning"),
      description: String(body.description).slice(0, 600),
      lat: Number(body.lat),
      lng: Number(body.lng),
      district: String(body.district ?? "Unknown"),
      place: String(body.place ?? "Unknown"),
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  });
  return NextResponse.json(mapReport(created), { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.status) return NextResponse.json({ error: "id and status required" }, { status: 400 });
  const allowed = ["pending", "verified", "resolved"];
  if (!allowed.includes(body.status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
  const updated = await db.fieldReport.update({ where: { id: body.id }, data: { status: body.status } });
  return NextResponse.json(mapReport(updated));
}
