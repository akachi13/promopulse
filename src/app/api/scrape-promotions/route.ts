import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { ApifyClient } from "apify-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PromotionSuggestion = {
  title: string;
  description: string;
  source_url: string;
  source_type: string;
  image_url: string | null;
  discount_percentage: number | null;
  old_price: number | null;
  new_price: number | null;
  valid_until: string | null;
  end_date: string | null;
  expires_at: string | null;
  validity_text: string | null;
  confidence_score: number;
};

type Candidate = {
  index: number;
  text: string;
  source_url?: string;
  source_type?: string;
  image_url?: string | null;
  published_at?: string | null;
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
  image_url?: string | null;
  old_price?: number | string | null;
  new_price?: number | string | null;
  discount_percentage?: number | string | null;
  valid_until?: string | null;
  end_date?: string | null;
  expires_at?: string | null;
  validity_text?: string | null;
  confidence_score?: number | string | null;
};

type ApifyDatasetItem = Record<string, unknown>;

const SOCIAL_SCRAPE_MAX_ITEMS = Number(process.env.SOCIAL_SCRAPE_MAX_ITEMS || 25);

const APIFY_TIKTOK_ACTOR_ID =
  process.env.APIFY_TIKTOK_ACTOR_ID || "clockworks/tiktok-scraper";

const APIFY_FACEBOOK_POSTS_ACTOR_ID =
  process.env.APIFY_FACEBOOK_POSTS_ACTOR_ID || "apify/facebook-posts-scraper";

const DEBUG_IMPORT_PROMOTIONS = process.env.DEBUG_IMPORT_PROMOTIONS !== "false";
const APIFY_FACEBOOK_CAPTION_TEXT =
  process.env.APIFY_FACEBOOK_CAPTION_TEXT !== "false";

function logImport(message: string, value?: unknown) {
  if (!DEBUG_IMPORT_PROMOTIONS) return;

  if (value === undefined) {
    console.log(`[IMPORT-PROMOTIONS] ${message}`);
    return;
  }

  console.log(`[IMPORT-PROMOTIONS] ${message}`, value);
}

function safePreview(value: unknown, maxLength = 2500) {
  try {
    return JSON.stringify(value, null, 2).slice(0, maxLength);
  } catch {
    return String(value).slice(0, maxLength);
  }
}

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

function scoreSocialCandidate(text: string) {
  const normalized = normalizeText(text);

  let score = scoreCandidate(text);

  const promotionWords = [
    "promo",
    "promotion",
    "solde",
    "soldes",
    "remise",
    "reduction",
    "offre",
    "bon plan",
    "prix special",
    "flash",
    "liquidation",
    "destockage",
    "black friday",
    "-",
    "%",
    "fcfa",
    "xof",
    "achetez",
    "gratuit",
    "cadeau",
  ];

  for (const word of promotionWords) {
    if (normalized.includes(word)) score += 8;
  }

  if (text.length < 20) score -= 40;
  if (text.length > 900) score -= 20;

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

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("Gemini n’a pas retourné un JSON exploitable.");
  }
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
    if (!cleaned) return null;
    const numberValue = Number(cleaned);
    return Number.isNaN(numberValue) ? null : numberValue;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return null;

  return numberValue;
}

function formatDateYYYYMMDD(date: Date) {
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toDateStringOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    const milliseconds = value > 9999999999 ? value : value * 1000;
    return formatDateYYYYMMDD(new Date(milliseconds));
  }

  if (typeof value !== "string") return null;

  const cleaned = cleanText(value);
  if (!cleaned) return null;

  const isoMatch = cleaned.match(/(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const frenchDate = cleaned.match(/(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])(?:[-/](20\d{2}))?/);
  if (frenchDate) {
    const [, day, month, year] = frenchDate;
    const resolvedYear = year || String(new Date().getFullYear());
    return `${resolvedYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(cleaned);
  return formatDateYYYYMMDD(parsed);
}

function inferValidUntilFromText(text: string, publishedAt?: string | null) {
  const normalized = normalizeText(text);
  const baseDateText = publishedAt || "";
  const baseDate = baseDateText ? new Date(baseDateText) : new Date();

  const explicitDate = toDateStringOrNull(text);
  if (explicitDate) return explicitDate;

  if (Number.isNaN(baseDate.getTime())) return null;

  if (normalized.includes("ce soir") || normalized.includes("aujourd'hui") || normalized.includes("aujourdhui")) {
    return formatDateYYYYMMDD(baseDate);
  }

  if (normalized.includes("demain")) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + 1);
    return formatDateYYYYMMDD(date);
  }

  const hoursMatch = normalized.match(/(?:pendant|reste|restent|dans)?\s*(\d{1,3})\s*h/);
  if (hoursMatch?.[1]) {
    const date = new Date(baseDate);
    date.setHours(date.getHours() + Number(hoursMatch[1]));
    return formatDateYYYYMMDD(date);
  }

  return null;
}

function getValidityTextFromResult(item: GeminiPromotionResult, candidateText: string) {
  const explicit = firstText(item.validity_text, item.valid_until, item.end_date, item.expires_at);
  if (explicit) return explicit;

  const match = candidateText.match(/(?:jusqu[’']?au|valable jusqu[’']?au|du .*? au|reste(?:nt)? .*?|dernier(?:s)? jour(?:s)?|ce soir|ce week[- ]?end|48h|24h)[^.!?\n]{0,80}/i);
  return match ? cleanText(match[0]) : null;
}

function hasConcreteProductOrPrice(text: string) {
  const normalized = normalizeText(text);

  if (!hasPrice(text) && !/%/.test(text)) return false;

  const genericOnlySignals = [
    "prix chocs du weekend",
    "prix chocs du week-end",
    "catalogue complet",
    "consultez notre catalogue",
    "offres qui donnent le sourire",
    "bons plans qui font plaisir au budget",
  ];

  if (genericOnlySignals.some((signal) => normalized.includes(signal)) && !hasPrice(text)) {
    return false;
  }

  return true;
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


function hasPromotionIntent(text: string) {
  const normalized = normalizeText(text);

  const promotionSignals = [
    "promo",
    "promos",
    "promotion",
    "promotions",
    "prix chocs",
    "prix choc",
    "offre",
    "offres",
    "catalogue",
    "catalogues",
    "bon plan",
    "bons plans",
    "soldes",
    "solde",
    "remise",
    "reduction",
    "flash",
    "destockage",
    "liquidation",
    "profiter",
    "j'en profite",
    "budget",
    "moins cher",
    "dernier jour",
    "48h",
    "weekend",
    "week-end",
    "se terminent",
    "depêche-toi",
    "depeche-toi",
    "ne ratez pas",
    "a ne pas manquer",
    "%",
    "fcfa",
    "xof",
  ];

  return promotionSignals.some((signal) => normalized.includes(signal));
}

function extractFirstPrice(text: string) {
  const match = text.match(/(\d[\d\s.]{2,})\s?(FCFA|F CFA|XOF|francs?)/i);

  if (!match?.[1]) return null;

  const value = Number(match[1].replace(/[^\d]/g, ""));

  return Number.isFinite(value) ? value : null;
}

function hasHardCategoryMismatch(text: string, categoryName: string) {
  const normalizedText = normalizeText(text);
  const normalizedCategory = normalizeText(categoryName);

  if (normalizedCategory.includes("alimentation")) {
    const nonFoodSignals = [
      "cuisiniere",
      "cuisine 4 feux",
      "four a gaz",
      "refrigerateur",
      "frigo",
      "congelateur",
      "climatiseur",
      "television",
      "televiseur",
      "smart android",
      "xboom",
      "machine a laver",
      "smartphone",
      "telephone",
      "ordinateur",
      "laptop",
      "electromenager",
    ];

    return nonFoodSignals.some((signal) => normalizedText.includes(signal));
  }

  if (normalizedCategory.includes("beaute")) {
    const foodSignals = [
      "riz",
      "huile",
      "sucre",
      "thon",
      "sardine",
      "pates",
      "lait concentre",
      "boisson",
      "jus",
    ];

    return foodSignals.some((signal) => normalizedText.includes(signal));
  }

  return false;
}

function buildSocialFallbackSuggestions(params: {
  candidates: Candidate[];
  categoryName: string;
  sourceType: string;
  sourceUrl: string;
}) {
  const fallbackSuggestions = params.candidates
    .filter((candidate) => hasPromotionIntent(candidate.text))
    .filter((candidate) => hasConcreteProductOrPrice(candidate.text))
    .filter(
      (candidate) => !hasHardCategoryMismatch(candidate.text, params.categoryName)
    )
    .sort((a, b) => scoreSocialCandidate(b.text) - scoreSocialCandidate(a.text))
    .slice(0, 6)
    .map((candidate): PromotionSuggestion => {
      const price = extractFirstPrice(candidate.text);
      const title = buildFallbackTitle(candidate.text);
      const score = scoreSocialCandidate(candidate.text);
      const validUntil = inferValidUntilFromText(candidate.text, candidate.published_at);
      const validityText = getValidityTextFromResult({}, candidate.text);

      return {
        title: cleanText(title).slice(0, 120),
        description: cleanText(candidate.text),
        source_url: candidate.source_url || params.sourceUrl,
        source_type: candidate.source_type || params.sourceType,
        image_url: candidate.image_url || null,
        discount_percentage: null,
        old_price: null,
        new_price: price,
        valid_until: validUntil,
        end_date: validUntil,
        expires_at: validUntil,
        validity_text: validityText,
        confidence_score: Math.min(78, Math.max(58, 58 + Math.round(score / 3))),
      };
    })
    .filter((suggestion) => suggestion.title.length > 3)
    .filter((suggestion) => suggestion.new_price !== null);

  return fallbackSuggestions;
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
      const candidateSourceUrl = candidate.source_url || params.sourceUrl;
      const candidateSourceType = candidate.source_type || params.sourceType;

      const imageUrl = candidate.image_url ? ` | Image ${candidate.image_url}` : "";
      const publishedAt = candidate.published_at ? ` | Date publication ${candidate.published_at}` : "";

      return `Index ${candidate.index} | Source ${candidateSourceType} | URL ${candidateSourceUrl}${publishedAt}${imageUrl}: ${candidate.text}`;
    })
    .join("\n\n");

  return `
Tu es un expert en extraction de promotions PRODUIT pour une application appelée PromoPulse.

Magasin sélectionné : ${params.storeName}
Catégorie recherchée : ${params.categoryName}
Source principale : ${params.sourceType}
URL principale : ${params.sourceUrl}

Objectif : extraire uniquement des promotions liées à des produits ou articles précis.

Règles strictes :
- Retourne uniquement une suggestion si le bloc contient un produit concret ou un article identifiable ET au moins un prix, un pourcentage de réduction ou une mécanique commerciale chiffrée.
- Ne retourne PAS les annonces générales du type "Prix Chocs", "offres du week-end", "catalogue", "dernières heures", "bons plans", si aucun produit précis et aucun prix produit ne sont visibles dans le texte.
- Ne retourne PAS les jeux concours, gagnants, remerciements, annonces institutionnelles, messages de communauté, posts d'image de marque ou simples invitations à consulter un catalogue.
- Ne devine jamais un produit, un prix, une date ou une réduction. Si l'information n'est pas explicitement dans le bloc, mets null ou rejette le bloc.
- Si un seul prix est présent, mets ce prix dans new_price et old_price à null.
- Si deux prix sont présents, old_price est généralement le plus élevé ou le prix barré, new_price est le plus bas ou le prix réduit.
- Si aucun prix et aucun pourcentage chiffré n'est présent, rejette le bloc.
- Pour valid_until, retourne une date au format YYYY-MM-DD uniquement si elle est explicitement indiquée ou clairement déductible d'une expression relative avec la date de publication fournie. Sinon mets null.
- Pour validity_text, recopie le texte de validité détecté, par exemple "jusqu'au 15/05/2026", "ce soir", "48h". Sinon mets null.
- Pour image_url, recopie l'image fournie dans le bloc si disponible. Sinon mets null.
- Respecte la catégorie recherchée. Si la catégorie est Alimentation, rejette l'électroménager, les téléphones, la beauté, la mode, etc.
- "Lait corporel", "Nivea", "crème", "savon", "shampoing", "parfum" = Beauté, pas Alimentation.
- "Lait concentré", "lait en poudre", "riz", "huile", "sucre", "pâtes", "boisson", "thon", "sardine" = Alimentation.
- "TV", "Smart Android", "LG", "XBOOM", "groupe électrogène", "réfrigérateur", "climatiseur", "cuisinière" = Électroménager.
- confidence_score doit être entre 0 et 100.

Réponds uniquement avec ce JSON :
{
  "suggestions": [
    {
      "candidate_index": 0,
      "is_promotion": true,
      "product_name": "Nom du produit",
      "title": "Nom produit + prix ou remise",
      "description": "Description propre de la promotion produit",
      "detected_category": "Catégorie détectée",
      "image_url": null,
      "old_price": 10000,
      "new_price": 7500,
      "discount_percentage": 25,
      "valid_until": "2026-05-31",
      "end_date": "2026-05-31",
      "expires_at": "2026-05-31",
      "validity_text": "Valable jusqu'au 31/05/2026",
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

  if (params.candidates.length === 0) {
    return [];
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

  logImport(
    `[GEMINI/${params.sourceType}] candidats analysés`,
    params.candidates.length
  );
  logImport(
    `[GEMINI/${params.sourceType}] réponse brute`,
    content.slice(0, 3000)
  );

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
      const validUntil =
        toDateStringOrNull(item.valid_until) ||
        toDateStringOrNull(item.end_date) ||
        toDateStringOrNull(item.expires_at) ||
        inferValidUntilFromText(originalText, candidate?.published_at);
      const validityText = getValidityTextFromResult(item, originalText);

      return {
        title: cleanText(String(title)).slice(0, 120),
        description: cleanText(String(description)),
        source_url: candidate?.source_url || params.sourceUrl,
        source_type: candidate?.source_type || params.sourceType,
        image_url: firstText(item.image_url, candidate?.image_url) || null,
        discount_percentage: toNumberOrNull(item.discount_percentage),
        old_price: toNumberOrNull(item.old_price),
        new_price: toNumberOrNull(item.new_price),
        valid_until: validUntil,
        end_date: validUntil,
        expires_at: validUntil,
        validity_text: validityText,
        confidence_score: Math.min(
          100,
          Math.max(0, Number(item.confidence_score || 70))
        ),
      };
    })
    .filter((item: PromotionSuggestion) => {
      const isSocialSource =
        params.sourceType === "facebook" || params.sourceType === "tiktok";

      return item.confidence_score >= (isSocialSource ? 55 : 65);
    })
    .filter((item: PromotionSuggestion) => item.title.length > 3)
    .filter((item: PromotionSuggestion) => item.new_price !== null || item.discount_percentage !== null)
    .filter((item: PromotionSuggestion) => !hasHardCategoryMismatch(`${item.title} ${item.description}`, params.categoryName));

  logImport(
    `[GEMINI/${params.sourceType}] suggestions retenues`,
    suggestions.map((suggestion) => ({
      title: suggestion.title,
      confidence_score: suggestion.confidence_score,
      source_type: suggestion.source_type,
    }))
  );

  if (
    suggestions.length === 0 &&
    (params.sourceType === "facebook" || params.sourceType === "tiktok")
  ) {
    const fallbackSuggestions = buildSocialFallbackSuggestions({
      candidates: params.candidates,
      categoryName: params.categoryName,
      sourceType: params.sourceType,
      sourceUrl: params.sourceUrl,
    });

    logImport(
      `[FALLBACK/${params.sourceType}] suggestions créées localement`,
      fallbackSuggestions.map((suggestion) => ({
        title: suggestion.title,
        confidence_score: suggestion.confidence_score,
        source_type: suggestion.source_type,
      }))
    );

    return fallbackSuggestions;
  }

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

  logImport(`[WEBSITE] candidats extraits depuis ${params.url}`, candidates.length);

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

function getApifyClient() {
  const token = process.env.APIFY_TOKEN;

  if (!token) {
    throw new Error(
      "La variable APIFY_TOKEN n’est pas configurée pour le scraping Facebook/TikTok."
    );
  }

  return new ApifyClient({ token });
}

async function runApifyActor(actorId: string, input: Record<string, unknown>) {
  const client = getApifyClient();

  logImport(`[APIFY] lancement actor ${actorId}`, input);

  const run = await client.actor(actorId).call(input);

  logImport(`[APIFY] actor terminé ${actorId}`, {
    id: run.id,
    status: run.status,
    defaultDatasetId: run.defaultDatasetId,
  });

  if (!run.defaultDatasetId) return [];

  const { items } = await client
    .dataset(run.defaultDatasetId)
    .listItems({ limit: SOCIAL_SCRAPE_MAX_ITEMS });

  logImport(`[APIFY] items récupérés ${actorId}`, items.length);

  const firstItem = items[0] as Record<string, unknown> | undefined;

  if (firstItem) {
    logImport(`[APIFY] clés du premier item ${actorId}`, Object.keys(firstItem));
    logImport(`[APIFY] aperçu premier item ${actorId}`, safePreview(firstItem));
  }

  return items as ApifyDatasetItem[];
}

function valueToString(value: unknown): string {
  if (typeof value === "string") return cleanText(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = valueToString(value);
    if (text) return text;
  }

  return "";
}

function getNestedValue(value: unknown, path: string[]) {
  let current = value;

  for (const segment of path) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }

  return current;
}

function collectTextFromArray(value: unknown, keys: string[]) {
  if (!Array.isArray(value)) return "";

  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (!isRecord(item)) return "";

      return firstText(...keys.map((key) => item[key]));
    })
    .filter(Boolean)
    .join(" ");
}

const DEEP_TEXT_KEYS = new Set([
  "text",
  "message",
  "caption",
  "description",
  "title",
  "postText",
  "post_text",
  "videoDescription",
  "ocrText",
  "alt",
]);

function collectDeepTextValues(value: unknown, depth = 0): string[] {
  if (depth > 4) return [];

  if (typeof value === "string") {
    const text = cleanText(value);
    return text.length >= 20 ? [text] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectDeepTextValues(item, depth + 1));
  }

  if (!isRecord(value)) return [];

  const texts: string[] = [];

  for (const [key, nestedValue] of Object.entries(value)) {
    if (DEEP_TEXT_KEYS.has(key)) {
      const text = valueToString(nestedValue);
      if (text.length >= 20) texts.push(text);
    }

    if (Array.isArray(nestedValue) || isRecord(nestedValue)) {
      texts.push(...collectDeepTextValues(nestedValue, depth + 1));
    }
  }

  return Array.from(new Set(texts));
}

function extractFacebookText(item: ApifyDatasetItem) {
  const directText = firstText(
    item.text,
    item.message,
    item.caption,
    item.description,
    item.postText,
    item.post_text,
    item.title,
    getNestedValue(item, ["post", "text"]),
    getNestedValue(item, ["post", "message"]),
    getNestedValue(item, ["message", "text"]),
    collectTextFromArray(item.attachments, ["title", "description", "text", "caption"]),
    collectTextFromArray(item.media, ["title", "description", "text", "caption", "alt"]),
    collectTextFromArray(item.images, ["title", "description", "text", "caption", "alt", "ocrText"])
  );

  if (directText) return directText;

  return collectDeepTextValues(item).join(" ");
}

function extractTikTokText(item: ApifyDatasetItem) {
  const directText = firstText(
    item.text,
    item.desc,
    item.description,
    item.title,
    item.caption,
    item.videoDescription,
    item.postText,
    item.post_text,
    getNestedValue(item, ["video", "description"]),
    getNestedValue(item, ["authorMeta", "signature"])
  );

  if (directText) return directText;

  return collectDeepTextValues(item).join(" ");
}

function extractFacebookUrl(item: ApifyDatasetItem, fallbackUrl: string) {
  return firstText(
    item.url,
    item.postUrl,
    item.permalink,
    item.facebookUrl,
    item.link,
    getNestedValue(item, ["post", "url"]),
    fallbackUrl
  );
}

function extractTikTokUrl(item: ApifyDatasetItem, fallbackUrl: string) {
  return firstText(
    item.webVideoUrl,
    item.url,
    item.videoUrl,
    item.shareUrl,
    item.link,
    getNestedValue(item, ["video", "url"]),
    fallbackUrl
  );
}

function findFirstUrlInValue(value: unknown): string {
  if (typeof value === "string") {
    const text = valueToString(value);
    return /^https?:\/\//i.test(text) ? text : "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstUrlInValue(item);
      if (found) return found;
    }
  }

  if (isRecord(value)) {
    const preferredKeys = [
      "image",
      "imageUrl",
      "thumbnail",
      "thumbnailUrl",
      "photo",
      "photoUrl",
      "url",
      "src",
      "coverUrl",
      "displayUrl",
    ];

    for (const key of preferredKeys) {
      const found = findFirstUrlInValue(value[key]);
      if (found) return found;
    }

    for (const nested of Object.values(value)) {
      const found = findFirstUrlInValue(nested);
      if (found) return found;
    }
  }

  return "";
}

function extractSocialImageUrl(item: ApifyDatasetItem) {
  return firstText(
    item.image,
    item.imageUrl,
    item.thumbnail,
    item.thumbnailUrl,
    item.photo,
    item.coverUrl,
    getNestedValue(item, ["media", "image"]),
    getNestedValue(item, ["media", "thumbnail"]),
    getNestedValue(item, ["video", "coverUrl"]),
    findFirstUrlInValue(item.media),
    findFirstUrlInValue(item.images),
    findFirstUrlInValue(item.attachments)
  );
}

function extractPublishedAt(item: ApifyDatasetItem) {
  return (
    toDateStringOrNull(item.time) ||
    toDateStringOrNull(item.timestamp) ||
    toDateStringOrNull(item.createdAt) ||
    toDateStringOrNull(item.date) ||
    toDateStringOrNull(item.createTimeISO) ||
    toDateStringOrNull(item.createTime) ||
    null
  );
}

function datasetItemsToCandidates(params: {
  items: ApifyDatasetItem[];
  sourceType: "facebook" | "tiktok";
  fallbackUrl: string;
}) {
  const candidatesMap = new Map<string, Candidate>();

  for (const item of params.items) {
    const text =
      params.sourceType === "facebook"
        ? extractFacebookText(item)
        : extractTikTokText(item);

    const sourceUrl =
      params.sourceType === "facebook"
        ? extractFacebookUrl(item, params.fallbackUrl)
        : extractTikTokUrl(item, params.fallbackUrl);

    const imageUrl = extractSocialImageUrl(item);
    const publishedAt = extractPublishedAt(item);

    const cleanedText = cleanText(text);

    if (!cleanedText) continue;
    if (cleanedText.length < 20) continue;
    if (looksLikeNoise(cleanedText)) continue;

    // Important : on évite de filtrer trop agressivement ici.
    // Certains posts Facebook/TikTok annoncent une offre dans une image ou avec peu de mots-clés.
    // Gemini fera le tri final entre les vraies promotions et les publications générales.
    if (scoreSocialCandidate(cleanedText) < -10) continue;

    const normalized = normalizeText(`${sourceUrl} ${cleanedText}`);

    candidatesMap.set(normalized, {
      index: 0,
      text: cleanedText.slice(0, 900),
      source_url: sourceUrl || params.fallbackUrl,
      source_type: params.sourceType,
      image_url: imageUrl || null,
      published_at: publishedAt,
    });
  }

  return Array.from(candidatesMap.values())
    .sort((a, b) => scoreSocialCandidate(b.text) - scoreSocialCandidate(a.text))
    .slice(0, 35)
    .map((candidate, index) => ({
      ...candidate,
      index,
    }));
}

function extractTikTokUsername(url: string) {
  const match = url.match(/tiktok\.com\/@([^/?#]+)/i);
  return match?.[1] || "";
}

function extractTikTokHashtag(url: string) {
  const match = url.match(/tiktok\.com\/tag\/([^/?#]+)/i);
  return match?.[1] || "";
}

function buildTikTokInput(tiktokUrl: string) {
  const username = extractTikTokUsername(tiktokUrl);
  const hashtag = extractTikTokHashtag(tiktokUrl);
  const isVideoUrl = /tiktok\.com\/.+\/video\//i.test(tiktokUrl);

  if (hashtag) {
    return {
      hashtags: [hashtag],
      resultsPerPage: SOCIAL_SCRAPE_MAX_ITEMS,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSlideshowImages: false,
      shouldDownloadAvatars: false,
      shouldDownloadMusicCovers: false,
    };
  }

  if (username && !isVideoUrl) {
    return {
      profiles: [username],
      profileScrapeSections: ["videos"],
      profileSorting: "latest",
      resultsPerPage: SOCIAL_SCRAPE_MAX_ITEMS,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSlideshowImages: false,
      shouldDownloadAvatars: false,
      shouldDownloadMusicCovers: false,
    };
  }

  return {
    postURLs: [tiktokUrl],
    resultsPerPage: SOCIAL_SCRAPE_MAX_ITEMS,
    scrapeRelatedVideos: false,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadAvatars: false,
    shouldDownloadMusicCovers: false,
  };
}

async function scrapeTikTokWithApify(params: {
  url: string;
  storeName: string;
  categoryName: string;
}) {
  if (!params.url) return [];

  const items = await runApifyActor(
    APIFY_TIKTOK_ACTOR_ID,
    buildTikTokInput(params.url)
  );

  logImport("[TIKTOK/APIFY] items récupérés", items.length);

  const candidates = datasetItemsToCandidates({
    items,
    sourceType: "tiktok",
    fallbackUrl: params.url,
  });

  logImport("[TIKTOK] candidats envoyés à Gemini", candidates.length);
  logImport(
    "[TIKTOK] aperçu candidats",
    candidates.slice(0, 5).map((candidate) => ({
      index: candidate.index,
      text: candidate.text.slice(0, 250),
      source_url: candidate.source_url,
    }))
  );

  const suggestions = await classifyWithGemini({
    candidates,
    storeName: params.storeName,
    categoryName: params.categoryName,
    sourceUrl: params.url,
    sourceType: "tiktok",
  });

  logImport("[TIKTOK/GEMINI] suggestions retournées", suggestions.length);

  return suggestions;
}

async function scrapeFacebookWithApify(params: {
  url: string;
  storeName: string;
  categoryName: string;
}) {
  if (!params.url) return [];

  const items = await runApifyActor(APIFY_FACEBOOK_POSTS_ACTOR_ID, {
    startUrls: [{ url: params.url }],
    resultsLimit: SOCIAL_SCRAPE_MAX_ITEMS,
    captionText: APIFY_FACEBOOK_CAPTION_TEXT,
  });

  logImport("[FACEBOOK/APIFY] items récupérés", items.length);

  const candidates = datasetItemsToCandidates({
    items,
    sourceType: "facebook",
    fallbackUrl: params.url,
  });

  logImport("[FACEBOOK] candidats envoyés à Gemini", candidates.length);
  logImport(
    "[FACEBOOK] aperçu candidats",
    candidates.slice(0, 5).map((candidate) => ({
      index: candidate.index,
      text: candidate.text.slice(0, 250),
      source_url: candidate.source_url,
    }))
  );

  const suggestions = await classifyWithGemini({
    candidates,
    storeName: params.storeName,
    categoryName: params.categoryName,
    sourceUrl: params.url,
    sourceType: "facebook",
  });

  logImport("[FACEBOOK/GEMINI] suggestions retournées", suggestions.length);

  return suggestions;
}

function normalizeSuggestionForDeduplication(suggestion: PromotionSuggestion) {
  return normalizeText(
    `${suggestion.title} ${suggestion.description} ${suggestion.new_price || ""}`
  );
}

function deduplicateSuggestions(suggestions: PromotionSuggestion[]) {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    const key = normalizeSuggestionForDeduplication(suggestion);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const storeName = body.store_name || "";
    const categoryName = body.category_name || "";

    logImport("[SCRAPE] requête reçue", {
      storeName,
      categoryName,
      hasWebsiteUrl: Boolean(body.website_url),
      hasFacebookUrl: Boolean(body.facebook_url),
      hasTikTokUrl: Boolean(body.tiktok_url),
      facebookUrl: body.facebook_url || null,
      tiktokUrl: body.tiktok_url || null,
    });

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

    const allSuggestions: PromotionSuggestion[] = [];

    if (body.website_url) {
      const websiteSuggestions = await scrapeUrl({
        url: body.website_url,
        sourceType: "website",
        storeName,
        categoryName,
      });

      allSuggestions.push(...websiteSuggestions);
    }

    if (body.facebook_url) {
      const facebookSuggestions = await scrapeFacebookWithApify({
        url: body.facebook_url,
        storeName,
        categoryName,
      });

      allSuggestions.push(...facebookSuggestions);
    }

    if (body.tiktok_url) {
      const tiktokSuggestions = await scrapeTikTokWithApify({
        url: body.tiktok_url,
        storeName,
        categoryName,
      });

      allSuggestions.push(...tiktokSuggestions);
    }

    const uniqueSuggestions = deduplicateSuggestions(allSuggestions);

    logImport("[SCRAPE] total suggestions avant déduplication", allSuggestions.length);
    logImport("[SCRAPE] total suggestions finales", uniqueSuggestions.length);

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

    logImport("[ERREUR] traitement import promotions", {
      message,
      error: safePreview(error),
    });

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