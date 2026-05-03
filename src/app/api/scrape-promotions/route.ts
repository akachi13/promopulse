import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PromotionSuggestion = {
  title: string;
  description: string;
  source_url: string;
  source_type: string;
  discount_percentage: number | null;
  old_price: number | null;
  new_price: number | null;
  confidence_score: number;
};

type Candidate = {
  index: number;
  text: string;
};

type GeminiPart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiGenerateResponse = {
  candidates?: GeminiCandidate[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GeminiPromotionResult = {
  candidate_index?: number | string;
  is_promotion?: boolean;
  product_name?: string;
  title?: string;
  description?: string;
  detected_category?: string;
  old_price?: number | string | null;
  new_price?: number | string | null;
  discount_percentage?: number | string | null;
  confidence_score?: number | string | null;
};

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPrice(text: string) {
  return /(\d[\d\s.]{2,})\s?(FCFA|F CFA|XOF|francs?)/i.test(text);
}

function countPrices(text: string) {
  return Array.from(
    text.matchAll(/(\d[\d\s.]{2,})\s?(FCFA|F CFA|XOF|francs?)/gi)
  ).length;
}

function looksLikeNoise(text: string) {
  const normalized = normalizeText(text);

  const noiseWords = [
    "accueil",
    "nos promotions",
    "toutes les categories",
    "tous les magasins",
    "nous contacter",
    "nous rejoindre",
    "rechercher",
    "catalogues",
    "carrefour et vous",
  ];

  if (normalized.length < 20) return true;

  if (noiseWords.some((word) => normalized === word)) return true;

  if (
    normalized.includes("accueil") &&
    normalized.includes("nos promotions") &&
    normalized.length < 150
  ) {
    return true;
  }

  return false;
}

function scoreCandidate(text: string) {
  const normalized = normalizeText(text);

  let score = 0;

  if (hasPrice(text)) score += 40;
  if (normalized.includes("promo")) score += 20;
  if (normalized.includes("promotion")) score += 20;
  if (normalized.includes("j'en profite")) score += 20;
  if (normalized.includes("fcfa")) score += 20;
  if (/%/.test(text)) score += 10;

  const priceCount = countPrices(text);

  if (priceCount >= 2) score += 20;
  if (priceCount > 5) score -= 40;

  if (text.length > 450) score -= 20;

  return score;
}

function extractCandidates(html: string): Candidate[] {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, nav, header, footer").remove();

  const candidatesMap = new Map<string, string>();

  $("body *").each((_, element) => {
    const text = cleanText($(element).text());

    if (text.length < 25 || text.length > 650) return;
    if (!hasPrice(text)) return;
    if (looksLikeNoise(text)) return;
    if (countPrices(text) > 6) return;

    const normalized = normalizeText(text);

    candidatesMap.set(normalized, text);
  });

  return Array.from(candidatesMap.values())
    .sort((a, b) => scoreCandidate(b) - scoreCandidate(a))
    .slice(0, 35)
    .map((text, index) => ({
      index,
      text,
    }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGeminiPromotionResult(
  value: unknown
): value is GeminiPromotionResult {
  return isRecord(value);
}

function parseJsonSafely(content: string): unknown {
  const cleaned = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleaned);
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return null;

  return numberValue;
}

function buildFallbackTitle(text: string) {
  const cleaned = cleanText(text)
    .replace(/j'en profite/gi, "")
    .replace(/promotion/gi, "")
    .replace(/(\d[\d\s.]{2,})\s?(FCFA|F CFA|XOF|francs?)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Promotion détectée";

  if (cleaned.length > 90) {
    return `${cleaned.slice(0, 87).trim()}...`;
  }

  return cleaned;
}

function buildPrompt(params: {
  candidates: Candidate[];
  storeName: string;
  categoryName: string;
  sourceUrl: string;
  sourceType: string;
}) {
  const candidatesText = params.candidates
    .map((candidate) => {
      return `Index ${candidate.index}: ${candidate.text}`;
    })
    .join("\n\n");

  return `
Tu es un expert en extraction de promotions commerciales pour une application appelée PromoPulse.

Magasin sélectionné : ${params.storeName}
Catégorie recherchée : ${params.categoryName}
Source : ${params.sourceType}
URL source : ${params.sourceUrl}

Analyse les blocs ci-dessous.

Règles importantes :
- Retourne uniquement les vraies annonces promotionnelles de produits.
- Ignore les menus, titres de page, boutons, fil d’Ariane, textes généraux.
- La catégorie doit correspondre strictement à la catégorie recherchée.
- "Lait corporel", "Nivea", "crème", "savon", "shampoing", "parfum" = Beauté, pas Alimentation.
- "Lait concentré", "lait en poudre", "riz", "huile", "sucre", "pâtes", "boisson", "thon", "sardine" = Alimentation.
- "TV", "Smart Android", "LG", "XBOOM", "groupe électrogène", "réfrigérateur", "climatiseur" = Électroménager.
- Si la catégorie détectée est différente de la catégorie recherchée, ne retourne pas la promotion.
- N’invente jamais un prix ou une réduction.
- Si deux prix sont présents, old_price est généralement le prix le plus élevé ou le prix barré, new_price est le prix réduit.
- Si un seul prix est présent, mets old_price à null et new_price au prix détecté.
- confidence_score doit être entre 0 et 100.

Réponds uniquement avec ce JSON :
{
  "suggestions": [
    {
      "candidate_index": 0,
      "is_promotion": true,
      "product_name": "Nom du produit",
      "title": "Titre court",
      "description": "Description propre",
      "detected_category": "Catégorie détectée",
      "old_price": 10000,
      "new_price": 7500,
      "discount_percentage": 25,
      "confidence_score": 90
    }
  ]
}

Blocs à analyser :
${candidatesText}
  `.trim();
}

async function classifyWithGemini(params: {
  candidates: Candidate[];
  storeName: string;
  categoryName: string;
  sourceUrl: string;
  sourceType: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("La variable GEMINI_API_KEY n’est pas configurée.");
  }

  const modelName = model.replace(/^models\//, "");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const prompt = buildPrompt(params);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  const data = (await response.json()) as GeminiGenerateResponse;

  if (!response.ok) {
    const errorMessage =
      data.error?.message ||
      `Erreur Gemini API ${response.status}. Vérifiez la clé API ou le modèle.`;

    throw new Error(errorMessage);
  }

  const content =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "{}";

  const parsed = parseJsonSafely(content);

  const suggestionsValue = isRecord(parsed) ? parsed.suggestions : undefined;

  const rawSuggestions: GeminiPromotionResult[] = Array.isArray(
    suggestionsValue
  )
    ? suggestionsValue.filter(isGeminiPromotionResult)
    : [];

  const suggestions: PromotionSuggestion[] = rawSuggestions
    .filter((item: GeminiPromotionResult) => item.is_promotion === true)
    .map((item: GeminiPromotionResult): PromotionSuggestion => {
      const candidate = params.candidates.find(
        (candidateItem) => candidateItem.index === Number(item.candidate_index)
      );

      const originalText = candidate?.text || item.description || "";

      const title =
        item.title || item.product_name || buildFallbackTitle(originalText);

      const description = item.description || originalText;

      return {
        title: cleanText(String(title)).slice(0, 120),
        description: cleanText(String(description)),
        source_url: params.sourceUrl,
        source_type: params.sourceType,
        discount_percentage: toNumberOrNull(item.discount_percentage),
        old_price: toNumberOrNull(item.old_price),
        new_price: toNumberOrNull(item.new_price),
        confidence_score: Math.min(
          100,
          Math.max(0, Number(item.confidence_score || 70))
        ),
      };
    })
    .filter((item: PromotionSuggestion) => item.confidence_score >= 65)
    .filter((item: PromotionSuggestion) => item.title.length > 3);

  return suggestions;
}

async function scrapeUrl(params: {
  url: string;
  sourceType: string;
  storeName: string;
  categoryName: string;
}) {
  if (!params.url) return [];

  const response = await fetch(params.url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; PromoPulseBot/1.0; +https://promopulse-phi.vercel.app)",
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const candidates = extractCandidates(html);

  if (candidates.length === 0) {
    return [];
  }

  const suggestions = await classifyWithGemini({
    candidates,
    storeName: params.storeName,
    categoryName: params.categoryName,
    sourceUrl: params.url,
    sourceType: params.sourceType,
  });

  return suggestions;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const storeName = body.store_name || "";
    const categoryName = body.category_name || "";

    if (!categoryName) {
      return NextResponse.json(
        {
          error: "La catégorie est obligatoire pour lancer l’analyse IA.",
          suggestions: [],
        },
        {
          status: 400,
        }
      );
    }

    const urls = [
      {
        url: body.website_url,
        sourceType: "website",
      },
      {
        url: body.facebook_url,
        sourceType: "facebook",
      },
      {
        url: body.tiktok_url,
        sourceType: "tiktok",
      },
    ];

    const allSuggestions: PromotionSuggestion[] = [];

    for (const item of urls) {
      if (!item.url) continue;

      const suggestions = await scrapeUrl({
        url: item.url,
        sourceType: item.sourceType,
        storeName,
        categoryName,
      });

      allSuggestions.push(...suggestions);
    }

    const uniqueSuggestions = allSuggestions.filter(
      (
        suggestion: PromotionSuggestion,
        index: number,
        array: PromotionSuggestion[]
      ) =>
        array.findIndex(
          (item: PromotionSuggestion) =>
            item.title === suggestion.title ||
            item.description === suggestion.description
        ) === index
    );

    return NextResponse.json({
      suggestions: uniqueSuggestions.sort(
        (a: PromotionSuggestion, b: PromotionSuggestion) =>
          b.confidence_score - a.confidence_score
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur inconnue pendant le traitement IA Gemini.";

    return NextResponse.json(
      {
        error: message,
        suggestions: [],
      },
      {
        status: 500,
      }
    );
  }
}
