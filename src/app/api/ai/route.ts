import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { mapHabitation, mapAlert } from "@/lib/server/data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const messages: { role: "user" | "assistant"; content: string }[] = Array.isArray(body?.messages)
      ? body.messages.slice(-10).map((m: { role: string; content: string }) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content ?? "").slice(0, 4000),
        }))
      : [];
    if (!messages.length || !messages[messages.length - 1].content.trim()) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }
    const lang: string = body?.lang === "hi" ? "hi" : body?.lang === "mr" ? "mr" : "en";

    // Ground the assistant in live ResQX data
    const [habRows, alertRows] = await Promise.all([
      db.habitation.findMany({ orderBy: { urgency: "desc" }, take: 6 }),
      db.alert.findMany({ where: { active: true }, orderBy: { issuedAt: "desc" } }),
    ]);
    const topHabitations = habRows.map(mapHabitation);
    const activeAlerts = alertRows.map(mapAlert);

    const contextBlock = [
      "You are ResQ AI, the assistant of ResQX — a Maharashtra (India) government-grade disaster management platform (SIH PS191).",
      "You help district officials and citizens with: hazard risks, relocation priority, carrying capacity, government schemes (PMAY-G, PMFBY, PMSBY ₹20/yr, PMJJBY, NDRF/SDRF norms: ₹4 lakh ex-gratia for death, ₹1.2L fully damaged pucca house), and preparedness steps.",
      "Live platform data right now:",
      `Top relocation-priority habitations: ${topHabitations.map((h) => `${h.name} (${h.taluka}, ${h.district}) — hazard ${h.hazardScore}/100, ${h.riskLevel} risk, vulnerability ${h.vulnerability}, urgency ${h.urgency}, pop ${h.population.toLocaleString("en-IN")}`).join("; ")}`,
      `Active alerts: ${activeAlerts.map((a) => `[${a.severity.toUpperCase()}] ${a.title} (${a.district})`).join("; ") || "none"}`,
      "Known Maharashtra disaster references: 26 July 2005 Mumbai deluge (944mm/24h), Malin landslide 2014 (151 deaths), Taliye landslide 2020, Cyclone Nisarga 2020, Krishna-Panchganga floods 2019 & 2021, Chiplun flood 2021, Killari earthquake 1993 (M6.2), chronic Marathwada drought.",
      `Answer in ${lang === "hi" ? "Hindi (Devanagari script)" : lang === "mr" ? "Marathi (Devanagari script)" : "English"}.`,
      "Be concise (max ~150 words), practical, and format with short bullet points where helpful. Never invent fake phone numbers; use official ones like 108 (ambulance), 112 (emergency), 1078 (NDMA helpline), 1916? no — use 1077 (district disaster helpline).",
    ].join("\n");

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [{ role: "assistant", content: contextBlock }, ...messages],
      thinking: { type: "disabled" },
    });

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I could not process that right now.";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 500 });
  }
}
