"use client";

export interface AiCfg {
  provider: "anthropic";
  apiKey: string;
  model: string;
}

export const DEFAULT_AI_CFG: AiCfg = {
  provider: "anthropic",
  apiKey: "",
  model: "claude-haiku-4-5-20251001",
};

export interface GeneratedHook {
  text: string;
  type: "question" | "shock" | "problem" | "social_proof" | "curiosity";
}

export interface GeneratedScript {
  hook: string;
  body: string;
  cta: string;
  format: "UGC" | "voiceover" | "text_only";
  duration: string;
}

export interface GeneratedAdCopy {
  headline: string;
  primary: string;
  cta: string;
}

export interface CreativeGeneration {
  id: string;
  createdAt: number;
  product: string;
  niche: string;
  angle?: string;
  hooks: GeneratedHook[];
  scripts: GeneratedScript[];
  adCopy: GeneratedAdCopy[];
  tokensIn: number;
  tokensOut: number;
  estimatedCost: number;
}

interface ApiResponse {
  content: { type: string; text: string }[];
  usage: { input_tokens: number; output_tokens: number };
  stop_reason: string;
}

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";

// Pricing per 1M tokens (Haiku 4.5): input $1.00, output $5.00 — approx
const PRICE_IN_PER_TOK = 1.0 / 1_000_000;
const PRICE_OUT_PER_TOK = 5.0 / 1_000_000;

function buildPrompt(input: { product: string; niche?: string; angle?: string; targetAudience?: string }) {
  const niche = input.niche ? ` en el nicho "${input.niche}"` : "";
  const angle = input.angle ? `\nÁngulo preferido: ${input.angle}` : "";
  const audience = input.targetAudience ? `\nPúblico objetivo: ${input.targetAudience}` : "";

  return `Eres un experto en publicidad de Meta Ads para dropshipping con mentalidad de venta directa. Vas a generar contenido creativo para vender el producto "${input.product}"${niche}.${angle}${audience}

Genera EXACTAMENTE este JSON (sin markdown, sin explicación extra):

{
  "hooks": [
    { "text": "...", "type": "question" },
    { "text": "...", "type": "shock" },
    { "text": "...", "type": "problem" },
    { "text": "...", "type": "social_proof" },
    { "text": "...", "type": "curiosity" }
  ],
  "scripts": [
    { "hook": "...", "body": "...", "cta": "...", "format": "UGC", "duration": "15s" },
    { "hook": "...", "body": "...", "cta": "...", "format": "voiceover", "duration": "30s" },
    { "hook": "...", "body": "...", "cta": "...", "format": "UGC", "duration": "20s" }
  ],
  "adCopy": [
    { "headline": "...", "primary": "...", "cta": "Comprar ahora" },
    { "headline": "...", "primary": "...", "cta": "Conseguir el mío" },
    { "headline": "...", "primary": "...", "cta": "Ver oferta" }
  ]
}

Reglas estrictas:
- Hooks: primera frase del anuncio, máximo 8 palabras, deben PARAR el scroll
- Scripts: estructura hook → desarrollo → CTA, lenguaje natural en español, mencionar problema y solución
- Ad copy "primary": texto del anuncio en Meta, 2-3 frases con prueba social o urgencia
- Nada de emojis excesivos (máximo 1 por hook), nada de "amigo/amiga" cringe
- Tono directo, agresivo pero profesional, sin clickbait barato`;
}

export async function testAiConnection(cfg: AiCfg): Promise<{ ok: boolean; error?: string }> {
  if (!cfg.apiKey) return { ok: false, error: "API key vacía" };
  try {
    const res = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 10,
        messages: [{ role: "user", content: "Di OK" }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 120)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function generateCreativeIdeas(
  input: { product: string; niche?: string; angle?: string; targetAudience?: string },
  cfg: AiCfg
): Promise<CreativeGeneration> {
  if (!cfg.apiKey) throw new Error("API key de Anthropic no configurada");
  if (!input.product) throw new Error("Falta el nombre del producto");

  const res = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 1500,
      messages: [{ role: "user", content: buildPrompt(input) }],
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(errBody);
      if (parsed.error?.message) msg = parsed.error.message;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json() as ApiResponse;
  const text = data.content.find(c => c.type === "text")?.text ?? "";

  // Extract JSON from possible markdown fences
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("La IA no devolvió JSON válido");

  let parsed: { hooks: GeneratedHook[]; scripts: GeneratedScript[]; adCopy: GeneratedAdCopy[] };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("No se pudo parsear la respuesta de la IA");
  }

  const tokensIn = data.usage.input_tokens;
  const tokensOut = data.usage.output_tokens;
  const estimatedCost = tokensIn * PRICE_IN_PER_TOK + tokensOut * PRICE_OUT_PER_TOK;

  return {
    id: `gen-${Date.now()}`,
    createdAt: Date.now(),
    product: input.product,
    niche: input.niche ?? "",
    angle: input.angle,
    hooks: parsed.hooks ?? [],
    scripts: parsed.scripts ?? [],
    adCopy: parsed.adCopy ?? [],
    tokensIn,
    tokensOut,
    estimatedCost,
  };
}
