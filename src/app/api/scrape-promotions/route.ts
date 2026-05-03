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
};

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
    .filter((value) => !Number.isNaN(value));

  if (prices.length >= 2) {
    const sorted = [...prices].sort((a, b) => b - a);

    return {
      old_price: sorted[0],
      new_price: sorted[1],
    };
  }

  if (prices.length === 1) {
    return {
      old_price: null,
      new_price: prices[0],
    };
  }

  return {
    old_price: null,
    new_price: null,
  };
}

function looksLikePromotion(text: string) {
  const normalized = text.toLowerCase();

  const keywords = [
    "promo",
    "promotion",
    "réduction",
    "reduction",
    "solde",
    "soldes",
    "offre",
    "bon plan",
    "remise",
    "discount",
    "%",
    "fcfa",
    "f cfa",
    "xof",
  ];

  return keywords.some((keyword) => normalized.includes(keyword));
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function scrapeUrl(url: string, sourceType: string) {
  const suggestions: PromotionSuggestion[] = [];

  if (!url) return suggestions;

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; PromoPulseBot/1.0; +https://promopulse-phi.vercel.app)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return suggestions;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $("script, style, noscript, svg").remove();

    const candidates = new Set<string>();

    $("h1, h2, h3, h4, p, span, div, article, li").each((_, element) => {
      const text = cleanText($(element).text());

      if (text.length < 25 || text.length > 300) return;
      if (!looksLikePromotion(text)) return;

      candidates.add(text);
    });

    Array.from(candidates)
      .slice(0, 10)
      .forEach((text) => {
        const discount = extractDiscount(text);
        const prices = extractPrices(text);

        const title =
          text.length > 90 ? `${text.slice(0, 87).trim()}...` : text;

        suggestions.push({
          title,
          description: text,
          source_url: url,
          source_type: sourceType,
          discount_percentage: discount,
          old_price: prices.old_price,
          new_price: prices.new_price,
        });
      });

    return suggestions;
  } catch {
    return suggestions;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

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

    const suggestions = await scrapeUrl(item.url, item.sourceType);
    allSuggestions.push(...suggestions);
  }

  return NextResponse.json({
    suggestions: allSuggestions,
  });
}