import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const langSchema = z.enum(["bn", "en"]);
const inputSchema = z.object({
  lang: langSchema,
  texts: z.array(z.string().min(1).max(4000)).min(1).max(80),
});

async function sha(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

const PROMPT = {
  bn: "Translate each English string into natural, fluent, standard Bangla (Bengali script) as written on a professional Bangladeshi non-profit education website. Keep it concise and natural, not word-for-word. Keep unchanged: the organisation name 'Skill Bridgeway Foundation', 'Skill Bridgeway', 'Bridgeway', 'SBF', person names, emails, URLs, phone numbers, IDs, serial numbers, and brand/tech names (AI, ChatGPT, Canva, Facebook, WhatsApp, LinkedIn, Instagram, Google, PDF, QR). Use English digits as written. Preserve leading/trailing punctuation, symbols and spacing. If a string is already Bangla or untranslatable, return it unchanged.",
  en: "Translate each Bangla string into natural, fluent, professional English as written on a Bangladeshi non-profit education website. Keep person names, emails, URLs, phone numbers, IDs and brand names unchanged. Preserve punctuation and spacing. If a string is already English, return it unchanged.",
};

async function aiTranslate(texts: string[], lang: "bn" | "en"): Promise<string[]> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Translation unavailable");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions: `${PROMPT[lang]} Return exactly ${texts.length} translated strings in field "t", in the same order as the input JSON array.`,
      input: JSON.stringify(texts),
      text: {
        format: {
          type: "json_schema",
          name: "translations",
          strict: true,
          schema: { type: "object", properties: { t: { type: "array", items: { type: "string" } } }, required: ["t"], additionalProperties: false },
        },
      },
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Translation failed (${res.status})`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
      } catch { /* ignore partial */ }
    }
  }
  const parsed = JSON.parse(text || "{}");
  const out: unknown = parsed.t;
  if (!Array.isArray(out) || out.length !== texts.length) throw new Error("Bad translation response");
  return out.map((v, i) => (typeof v === "string" && v.trim() ? v : texts[i]!));
}

/** Public: returns cached translations, translating and caching any misses. */
export const translateTexts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const unique = Array.from(new Set(data.texts));
    const hashes = await Promise.all(unique.map(sha));
    const { data: rows } = await db
      .from("site_translations")
      .select("source_hash, translated")
      .eq("lang", data.lang)
      .in("source_hash", hashes);
    const cached = new Map<string, string>((rows ?? []).map((r: any) => [r.source_hash, r.translated]));
    const result: Record<string, string> = {};
    const missing: { text: string; hash: string }[] = [];
    unique.forEach((text, i) => {
      const h = hashes[i]!;
      const hit = cached.get(h);
      if (hit !== undefined) result[text] = hit;
      else missing.push({ text, hash: h });
    });
    for (let i = 0; i < missing.length; i += 40) {
      const chunk = missing.slice(i, i + 40);
      try {
        const translated = await aiTranslate(chunk.map((m) => m.text), data.lang);
        const insert = chunk.map((m, j) => ({ source_hash: m.hash, source: m.text, lang: data.lang, translated: translated[j]! }));
        await db.from("site_translations").upsert(insert, { onConflict: "source_hash,lang", ignoreDuplicates: true });
        chunk.forEach((m, j) => (result[m.text] = translated[j]!));
      } catch (e) {
        console.error("translate", e);
      }
    }
    return result;
  });
