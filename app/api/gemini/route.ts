import { GoogleGenerativeAI } from "@google/generative-ai";
import type { EnhancedGenerateContentResponse } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM = `Sen Luro adlı B2B ürününün web sitesi asistanısın.

Luro: Endüstriyel sahalar ve operasyonel ortamlar için yapay zeka destekli güvenlik izleme platformu. Mevcut IP kameralarla çalışır; bilgisayarlı görü ve gerçek zamanlı analiz ile PPE (baret, yelek vb.) tespiti, yasaklı alan ihlali, araç–personel yakınlık riski, anlık uyarılar ve olay/raporlama sunar.

Kurallar:
- Yanıtları her zaman Türkçe ver.
- Kısa, net, kurumsal ve güven veren bir dil kullan; abartılı satış dili kullanma.
- Ürün dışı konularda kısaca nazikçe reddet ve Luro ile ilgili yönlendir.
- Demo veya iletişim talebinde /demo sayfasına yönlendirmeyi öner.
- Kesin bilgi uydurma; emin değilsen "Bu konuda net bilgi için ekiple iletişime geçmenizi öneririm" de.`;

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
] as const;

type HistoryItem = { role: "user" | "model"; text: string };

type ContentPart = { role: "user" | "model"; parts: { text: string }[] };

function toGeminiHistory(items: HistoryItem[]): ContentPart[] {
  const out: ContentPart[] = [];
  for (const item of items) {
    const text = String(item.text || "").trim().slice(0, 8000);
    if (!text) continue;
    const role = item.role === "user" ? "user" : "model";
    const last = out[out.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${text}`;
    } else {
      out.push({ role, parts: [{ text }] });
    }
  }
  while (out.length > 0 && out[0].role === "model") {
    out.shift();
  }
  return out;
}

function geminiErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message);
  }
  return String(err);
}

function extractTextSafe(res: EnhancedGenerateContentResponse): string | null {
  const blockReason = res.promptFeedback?.blockReason;
  if (blockReason) {
    return null;
  }
  const parts = res.candidates?.[0]?.content?.parts;
  if (!parts?.length) return null;
  const chunks: string[] = [];
  for (const p of parts) {
    if (p && typeof p === "object" && "text" in p && typeof p.text === "string") {
      chunks.push(p.text);
    }
  }
  const t = chunks.join("").trim();
  return t || null;
}

function extractFinish(res: EnhancedGenerateContentResponse): string | undefined {
  const fr = res.candidates?.[0]?.finishReason;
  return typeof fr === "string" ? fr : undefined;
}

function politeReplyForFinish(finish?: string): string | null {
  if (!finish) return null;
  if (finish === "SAFETY" || finish === "PROHIBITED_CONTENT" || finish === "BLOCKLIST") {
    return "Üzgünüm, bu istek için yanıt üretilemiyor. Luro ürünü veya demo talebi hakkında sorunuzu farklı şekilde sorabilirsiniz.";
  }
  return null;
}

function buildFallbackPrompt(prior: ContentPart[], message: string): string {
  const lines: string[] = [SYSTEM, "", "Aşağıdaki diyaloğa göre son kullanıcı sorusunu kısa ve profesyonel Türkçe yanıtla.", ""];
  for (const c of prior) {
    const label = c.role === "user" ? "Kullanıcı" : "Asistan";
    lines.push(`${label}: ${c.parts[0]?.text ?? ""}`);
  }
  lines.push(`Kullanıcı: ${message}`);
  lines.push("Asistan:");
  return lines.join("\n");
}

async function restGenerateContent(
  apiKey: string,
  modelName: string,
  system: string,
  contents: ContentPart[]
): Promise<{ text: string | null; error: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body: Record<string, unknown> = {
    contents: contents.map((c) => ({
      role: c.role,
      parts: c.parts.map((p) => ({ text: p.text })),
    })),
    generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) {
    return { text: null, error: raw.slice(0, 600) };
  }

  type RestJson = {
    promptFeedback?: { blockReason?: string };
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ text?: string }> };
    }>;
    error?: { message?: string };
  };
  let json: RestJson;
  try {
    json = JSON.parse(raw) as RestJson;
  } catch {
    return { text: null, error: "REST yanıtı JSON değil" };
  }

  if (json.error?.message) {
    return { text: null, error: json.error.message };
  }

  if (json.promptFeedback?.blockReason) {
    return { text: null, error: `blocked: ${json.promptFeedback.blockReason}` };
  }

  const parts = json.candidates?.[0]?.content?.parts;
  const finish = json.candidates?.[0]?.finishReason;
  if (!parts?.length) {
    const polite = politeReplyForFinish(finish);
    if (polite) return { text: polite, error: "" };
    return { text: null, error: finish ? `no parts, finish=${finish}` : "no candidates" };
  }

  const t = parts.map((p) => p.text ?? "").join("").trim();
  if (!t) {
    const polite = politeReplyForFinish(finish);
    if (polite) return { text: polite, error: "" };
  }
  return { text: t || null, error: "" };
}

export async function POST(request: Request) {
  const rawKey = process.env.GEMINI_API_KEY;
  const key = rawKey?.trim().replace(/^["']|["']$/g, "") ?? "";

  if (!key) {
    return NextResponse.json(
      {
        error:
          "Yapay zeka asistanı yapılandırılmamış. GEMINI_API_KEY ortam değişkenini ekleyin.",
      },
      { status: 503 }
    );
  }

  if (!key.startsWith("AIza")) {
    return NextResponse.json(
      {
        error:
          "Geçersiz Gemini anahtarı formatı. https://aistudio.google.com/apikey adresinden anahtar oluşturun (genelde “AIza…” ile başlar).",
      },
      { status: 400 }
    );
  }

  let body: { message?: string; history?: HistoryItem[] };
  try {
    body = (await request.json()) as { message?: string; history?: HistoryItem[] };
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const message = String(body.message || "").trim().slice(0, 4000);
  if (!message) {
    return NextResponse.json({ error: "Mesaj boş olamaz." }, { status: 400 });
  }

  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const prior = toGeminiHistory(
    rawHistory.map((h) => ({
      role: h.role === "user" ? "user" : "model",
      text: String(h.text || ""),
    }))
  );

  const contents: ContentPart[] = [
    ...prior,
    { role: "user", parts: [{ text: message }] },
  ];

  const genAI = new GoogleGenerativeAI(key);

  let lastError = "";

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM,
      });

      const result = await model.generateContent({ contents });
      const finish = extractFinish(result.response);
      const polite = politeReplyForFinish(finish);
      if (polite) {
        return NextResponse.json({ text: polite });
      }

      let text =
        extractTextSafe(result.response) ??
        (() => {
          try {
            return result.response.text().trim() || null;
          } catch {
            return null;
          }
        })();

      if (text) {
        return NextResponse.json({ text });
      }
    } catch (e) {
      lastError = geminiErrorMessage(e);
    }

    try {
      const modelPlain = genAI.getGenerativeModel({ model: modelName });
      const fallbackPrompt = buildFallbackPrompt(prior, message);
      const result = await modelPlain.generateContent(fallbackPrompt);
      const finish = extractFinish(result.response);
      const polite = politeReplyForFinish(finish);
      if (polite) {
        return NextResponse.json({ text: polite });
      }

      const text =
        extractTextSafe(result.response) ??
        (() => {
          try {
            return result.response.text().trim() || null;
          } catch {
            return null;
          }
        })();

      if (text) {
        return NextResponse.json({ text });
      }
    } catch (e) {
      lastError = geminiErrorMessage(e);
    }
  }

  for (const modelName of MODELS) {
    const r1 = await restGenerateContent(key, modelName, SYSTEM, contents);
    if (r1.text) {
      return NextResponse.json({ text: r1.text });
    }
    if (r1.error) {
      lastError = r1.error;
    }

    const fallbackPrompt = buildFallbackPrompt(prior, message);
    const r2 = await restGenerateContent(key, modelName, "", [
      { role: "user", parts: [{ text: fallbackPrompt }] },
    ]);
    if (r2.text) {
      return NextResponse.json({ text: r2.text });
    }
    if (r2.error) {
      lastError = r2.error;
    }
  }

  const isDev = process.env.NODE_ENV === "development";

  return NextResponse.json(
    {
      error:
        "Gemini yanıt veremedi. AI Studio’dan alınan geçerli bir API anahtarı kullandığınızdan emin olun; sunucuyu yeniden başlatın. Sorun sürerse Google AI Studio’da ilgili modelin hesabınızda açık olduğunu kontrol edin.",
      ...(isDev && lastError ? { debug: lastError.slice(0, 800) } : {}),
    },
    { status: 502 }
  );
}
