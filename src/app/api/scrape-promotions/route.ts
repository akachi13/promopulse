import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

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

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  alimentation: [
    "riz",
    "huile",
    "lait",
    "sucre",
    "pâtes",
    "pates",
    "eau",
    "boisson",
    "jus",
    "café",
    "cafe",
    "thé",
    "the",
    "biscuit",
    "yaourt",
    "fromage",
    "poulet",
    "viande",
    "poisson",
    "conserve",
    "alimentaire",
  ],
  beauté: [
    "beauté",
    "beaute",
    "shampoing",
    "savon",
    "crème",
    "creme",
    "parfum",
    "lotion",
    "gel",
    "maquillage",
    "cosmétique",
    "cosmetique",
    "déodorant",
    "deodorant",
  ],
  electroménager: [
    "tv",
    "smart",
    "android",
    "haier",
    "lg",
    "samsung",
    "réfrigérateur",
    "refrigerateur",
    "congélateur",
    "congelateur",
    "machine",
    "climatiseur",
    "four",
    "micro-onde",
    "enceinte",
    "xboom",
    "groupe électrogène",
    "groupe electrogene",
  ],
  électroménager: [
    "tv",
    "smart",
    "android",
    "haier",
    "lg",
    "samsung",
    "réfrigérateur",
    "refrigerateur",
    "congélateur",
    "congelateur",
    "machine",
    "climatiseur",
    "four",
    "micro-onde",
    "enceinte",
    "xboom",
    "groupe électrogène",
    "groupe electrogene",
  ],
  "non alimentaire": [
    "chaise",
    "table",
    "linge",
    "drap",
    "matelas",
    "bassine",
    "seau",
    "assiette",
    "verre",
    "casserole",
    "poêle",
    "poele",
    "jouet",
    "cartable",
    "valise",
  ],
  mode: [
    "chaussure",
    "vêtement",
    "vetement",
    "robe",
    "chemise",
    "pantalon",
    "sac",
    "montre",
    "mode",
    "basket",
  ],
  santé: [
    "pharma",
    "santé",
    "sante",
    "vitamine",
    "médicament",
    "medicament",
    "parapharmacie",
  ],
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractDiscount(text: string) {
  const match = text.match(/-?\s?(\d{1,2})\s?%/);
  if (!match) return null;

  return Number(match[1]);
}

function extractPrices(text: string) {
  const prices = Array.from(
    text.matchAll(/(\d[\d\s.]{2,})\s?(FCFA|F CFA|XOF|francs?)/gi)
  )
    .map((match) => Number(match[1].replace(/\s|\./g, "")))
    .filter((value) => !Number.isNaN(value))
    .filter((value) => value > 100);

  const uniquePrices = Array.from(new Set(prices));

  if (uniquePrices.length >= 2) {
    const sorted = [...uniquePrices].sort((a, b) => b - a);

    return {
      old_price: sorted[0],
      new_price: sorted[1],
    };
  }

  if (uniquePrices.length === 1) {
    return {
      old_price: null,
      new_price: uniquePrices[0],
    };
  }

  return {
    old_price: null,
    new_price: null,
  };
}

function hasPromotionSignal(text: string) {
  const normalized = normalizeText(text);

  const keywords = [
    "promo",
    "promotion",
    "reduction",
    "solde",
    "soldes",
    "offre",
    "remise",
    "discount",
    "j'en profite",
    "fcfa",
    "f cfa",
    "xof",
    "%",
  ];

  return keywords.some((keyword) => normalized.includes(keyword));
}

function hasPrice(text: string) {
  return /(\d[\d\s.]{2,})\s?(FCFA|F CFA|XOF|francs?)/i.test(text);
}

function isNoise(text: string) {
  const normalized = normalizeText(text);

  const noiseTexts = [
    "accueil",
    "nos promotions",
    "toutes les categories",
    "tous les magasins",
    "nous contacter",
    "nous rejoindre",
    "nos marques",
    "carrefour et vous",
    "catalogues",
    "rechercher",
    "en ce moment",
  ];

  if (normalized.length < 20) return true;

  if (noiseTexts.some((noise) => normalized === noise)) return true;

  if (
    normalized.includes("accueil") &&
    normalized.includes("nos promotions") &&
    normalized.length < 80
  ) {
    return true;
  }

  return false;
}

function categoryMatches(text: string, categoryName: string) {
  if (!categoryName) return true;

  const normalizedCategory = normalizeText(categoryName);
  const normalizedText = normalizeText(text);

  if (normalizedText.includes(normalizedCategory)) return true;

  const keywords = CATEGORY_KEYWORDS[normalizedCategory] || [];

  if (keywords.length === 0) {
    return true;
  }

  return keywords.some((keyword) =>
    normalizedText.includes(normalizeText(keyword))
  );
}

function computeConfidence(text: string, categoryName: string) {
  let score = 0;

  if (hasPromotionSignal(text)) score += 25;
  if (hasPrice(text)) score += 35;
  if (extractDiscount(text)) score += 15;
  if (categoryMatches(text, categoryName)) score += 20;

  const normalized = normalizeText(text);

  if (normalized.includes("j'en profite")) score += 10;
  if (normalized.includes("fcfa")) score += 10;

  return Math.min(score, 100);
}

function createSuggestion(
  text: string,
  sourceUrl: string,
  sourceType: string,
  categoryName: string
): PromotionSuggestion | null {
  const cleaned = cleanText(text);

  if (isNoise(cleaned)) return null;
  if (!hasPrice(cleaned)) return null;
  if (!hasPromotionSignal(cleaned)) return null;
  if (!categoryMatches(cleaned, categoryName)) return null;

  const prices = extractPrices(cleaned);
  const discount = extractDiscount(cleaned);
  const confidence = computeConfidence(cleaned, categoryName);

  if (confidence < 55) return null;

  let title = cleaned;

  title = title
    .replace(/j'en profite/gi, "")
    .replace(/promotion/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (title.length > 90) {
    title = `${title.slice(0, 87).trim()}...`;
  }

  return {
    title,
    description: cleaned,
    source_url: sourceUrl,
    source_type: sourceType,
    discount_percentage: discount,
    old_price: prices.old_price,
    new_price: prices.new_price,
    confidence_score: confidence,
  };
}

async function scrapeUrl(
  url: string,
  sourceType: string,
  categoryName: string
) {
  const suggestions: PromotionSuggestion[] = [];

  if (!url) return suggestions;

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; PromoPulseBot/1.0; +https://promopulse-phi.vercel.app)",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return suggestions;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $("script, style, noscript, svg, nav, header, footer").remove();

    const candidates = new Set<string>();

    $("article, .product, .products, .card, .item, li, div").each(
      (_, element) => {
        const text = cleanText($(element).text());

        if (text.length < 30 || text.length > 500) return;
        if (!hasPrice(text)) return;
        if (!hasPromotionSignal(text)) return;

        candidates.add(text);
      }
    );

    Array.from(candidates).forEach((text) => {
      const suggestion = createSuggestion(
        text,
        url,
        sourceType,
        categoryName
      );

      if (suggestion) {
        suggestions.push(suggestion);
      }
    });

    const uniqueSuggestions = suggestions.filter(
      (suggestion, index, array) =>
        array.findIndex((item) => item.title === suggestion.title) === index
    );

    return uniqueSuggestions
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, 20);
  } catch {
    return suggestions;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const categoryName = body.category_name || "";

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

    const suggestions = await scrapeUrl(
      item.url,
      item.sourceType,
      categoryName
    );

    allSuggestions.push(...suggestions);
  }

  return NextResponse.json({
    suggestions: allSuggestions.sort(
      (a, b) => b.confidence_score - a.confidence_score
    ),
  });
}