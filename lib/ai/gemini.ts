import { GoogleGenerativeAI } from "@google/generative-ai";

// Same fallback model order as app/api/gemini/route.ts (the chat widget) — kept
// separate rather than shared because this is single-turn (no conversation
// history) generation, used for the onboarding recommendation step.
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
] as const;

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message);
  }
  return String(err);
}

async function restGenerate(apiKey: string, modelName: string, systemPrompt: string, userMessage: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { maxOutputTokens: 1024, temperature: 0.6 },
    }),
  });
  const raw = await res.text();
  if (!res.ok) return { text: null as string | null, error: raw.slice(0, 600) };

  try {
    const json = JSON.parse(raw) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };
    if (json.error?.message) return { text: null, error: json.error.message };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    return { text: text || null, error: "" };
  } catch {
    return { text: null, error: "REST yanıtı JSON değil" };
  }
}

/** Single-turn Gemini generation with the same multi-model + REST fallback
 *  strategy as the chat widget's /api/gemini route, minus conversation history. */
export async function generateGeminiText(
  systemPrompt: string,
  userMessage: string,
): Promise<{ text: string | null; error?: string }> {
  const rawKey = process.env.GEMINI_API_KEY;
  const key = rawKey?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!key) return { text: null, error: "GEMINI_API_KEY ortam değişkeni eksik." };

  const genAI = new GoogleGenerativeAI(key);
  let lastError = "";

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });
      const result = await model.generateContent(userMessage);
      const text = result.response.text().trim();
      if (text) return { text };
    } catch (e) {
      lastError = errorMessage(e);
    }
  }

  for (const modelName of MODELS) {
    const r = await restGenerate(key, modelName, systemPrompt, userMessage);
    if (r.text) return { text: r.text };
    if (r.error) lastError = r.error;
  }

  return { text: null, error: lastError || "Gemini yanıt veremedi." };
}
