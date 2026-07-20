import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getSession, refreshSessionCookie } from "@/lib/auth/session";
import { generateGeminiText } from "@/lib/ai/gemini";

type Body = {
  cameraCount?: string;
  concerns?: string[];
};

const SYSTEM_PROMPT = `Sen Luro'nun (endüstriyel güvenlik AI platformu) satış öncesi danışman yapay zekasısın. Görevin: müşterinin sektörü, şirket büyüklüğü ve endişeleri doğrultusunda, Luro'nun GERÇEKTEN sunduğu tespit özelliklerinden hangilerinin onlar için en önemli olduğunu kısaca önermek.

Luro'nun şu an gerçekten çalışan (üretimdeki modelde doğrulanmış) tespit özellikleri — SADECE bunlardan öner, başka bir şey uydurma:
- Baret tespiti
- Güvenlik yeleği tespiti
- Eldiven tespiti
- Ayak koruma (bot) tespiti
- Koruyucu gözlük tespiti
- Yasaklı bölge ihlali tespiti
- Araç/forklift yakınlık riski tespiti
- Video dosyası ve canlı kamera akışı (RTSP) desteği, kare bazlı takip

Şunlar henüz geliştirme aşamasında — ÖNERME, ama bağlamda geçerse "yakında geliyor" diye belirtebilirsin: yangın/duman tespiti, düşme şüphesi tespiti.

Kurallar:
- Türkçe yanıt ver, kısa ve samimi ol (3-5 cümle), abartılı satış dili kullanma, somut ol.
- Şirket büyüklüğüne göre bir plan öner: 1-10 veya 11-50 kişi ve az kamera → "baslangic"; 51-200 kişi veya orta kamera sayısı → "profesyonel"; 200+ kişi veya çok kamera / özel ihtiyaç → "kurumsal".
- Yanıtın SADECE şu JSON formatında olsun, başka hiçbir metin, markdown code fence veya açıklama ekleme:
{"recommendation": "...", "suggestedPlan": "baslangic", "topFeatures": ["...", "..."]}`;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const cameraCount = String(body.cameraCount || "").trim();
  const concerns = Array.isArray(body.concerns) ? body.concerns.filter((c) => typeof c === "string") : [];

  const [user] = await db.select().from(users).where(eq(users.id, session.id)).limit(1);
  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  const userMessage = [
    `Şirket: ${user.companyName ?? "-"}`,
    `Sektör: ${user.industry ?? "-"}`,
    `Şirket büyüklüğü: ${user.companySize ?? "-"}`,
    `Planlanan kamera sayısı: ${cameraCount || "-"}`,
    `Öncelikli endişeler: ${concerns.length ? concerns.join(", ") : "belirtilmedi"}`,
  ].join("\n");

  const { text, error } = await generateGeminiText(SYSTEM_PROMPT, userMessage);

  let recommendation: Record<string, unknown>;
  if (text) {
    try {
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      recommendation = JSON.parse(cleaned);
    } catch {
      recommendation = { recommendation: text, suggestedPlan: "profesyonel", topFeatures: [] };
    }
  } else {
    // Gemini unavailable: fall back to a safe, generic recommendation rather
    // than blocking onboarding on a third-party API being down.
    recommendation = {
      recommendation:
        "Şu an otomatik öneri oluşturulamadı, ancak sahanızda birden fazla PPE kontrolü ve yasaklı bölge/yakınlık tespiti kullanan ekipler için Profesyonel paketi öneriyoruz.",
      suggestedPlan: "profesyonel",
      topFeatures: [],
      geminiError: error,
    };
  }

  const [updated] = await db
    .update(users)
    .set({ recommendedSolutions: recommendation, onboardingStep: "plan" })
    .where(eq(users.id, session.id))
    .returning();

  const response = NextResponse.json({ ok: true, recommendation });
  await refreshSessionCookie(response, {
    id: updated.id,
    email: updated.email,
    companyName: updated.companyName,
    onboardingStep: updated.onboardingStep,
  });
  return response;
}
