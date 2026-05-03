"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

type Store = {
  id: string;
  name: string;
  website_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
};

type Category = {
  id: string;
  name: string;
};

type Suggestion = {
  title: string;
  description: string;
  source_url: string;
  source_type: string;
  discount_percentage: number | null;
  old_price: number | null;
  new_price: number | null;
  confidence_score?: number;
};

function formatPrice(price: number | null) {
  if (!price) return null;

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function ImportPromotionsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [message, setMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: storesData, error: storesError } = await supabase
        .from("stores")
        .select("id, name, website_url, facebook_url, tiktok_url")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (storesError) {
        setMessage(`Erreur magasins : ${storesError.message}`);
      }

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (categoriesError) {
        setMessage(`Erreur catégories : ${categoriesError.message}`);
      }

      setStores((storesData || []) as Store[]);
      setCategories((categoriesData || []) as Category[]);
    }

    loadData();
  }, []);

  function handleStoreChange(storeId: string) {
    setSelectedStoreId(storeId);
    setSuggestions([]);
    setMessage("");
  }

  function handleCategoryChange(categoryId: string) {
    setSelectedCategoryId(categoryId);
    setSuggestions([]);
    setMessage("");
  }

  async function scanPromotions() {
    setMessage("");
    setSuggestions([]);

    const store = stores.find((item) => item.id === selectedStoreId);
    const category = categories.find((item) => item.id === selectedCategoryId);

    if (!store) {
      setMessage("Veuillez sélectionner un magasin.");
      return;
    }

    if (!category) {
      setMessage("Veuillez sélectionner une catégorie avant de scanner.");
      return;
    }

    if (!store.website_url && !store.facebook_url && !store.tiktok_url) {
      setMessage(
        "Ce magasin n’a aucun lien site web, Facebook ou TikTok renseigné."
      );
      return;
    }

    setIsScanning(true);

    try {
      const response = await fetch("/api/scrape-promotions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          website_url: store.website_url,
          facebook_url: store.facebook_url,
          tiktok_url: store.tiktok_url,
          store_name: store.name,
          category_name: category.name,
        }),
      });

      if (!response.ok) {
        setMessage(
          "Erreur pendant le scan. Vérifiez l’API de scraping ou réessayez."
        );
        setIsScanning(false);
        return;
      }

      const result: {
        suggestions?: Suggestion[];
        error?: string;
      } = await response.json();

      setIsScanning(false);

      if (result.error) {
        setMessage(`Erreur : ${result.error}`);
        return;
      }

      const detectedSuggestions = result.suggestions || [];

      setSuggestions(detectedSuggestions);

      if (detectedSuggestions.length === 0) {
        setMessage(
          `Aucune promotion détectée pour ${store.name} dans la catégorie "${category.name}". Essayez une autre catégorie ou vérifiez le lien du magasin.`
        );
        return;
      }

      setMessage(
        `${detectedSuggestions.length} suggestion(s) détectée(s) pour ${store.name} / ${category.name}.`
      );
    } catch (error) {
      setIsScanning(false);
      setMessage(
        "Erreur technique pendant le scan. Le site peut être protégé ou inaccessible."
      );
    }
  }

  async function saveSuggestion(suggestion: Suggestion, index: number) {
    setMessage("");

    const store = stores.find((item) => item.id === selectedStoreId);
    const category = categories.find((item) => item.id === selectedCategoryId);

    if (!store) {
      setMessage("Veuillez sélectionner un magasin.");
      return;
    }

    if (!category) {
      setMessage("Veuillez sélectionner une catégorie.");
      return;
    }

    setSavingIndex(index);

    const { error } = await supabase.from("deals").insert({
      store_id: selectedStoreId,
      category_id: selectedCategoryId,
      title: suggestion.title,
      description: suggestion.description,
      old_price: suggestion.old_price,
      new_price: suggestion.new_price,
      discount_percentage: suggestion.discount_percentage,
      source_url: suggestion.source_url,
      source_type: suggestion.source_type,
      valid_from: new Date().toISOString().slice(0, 10),
      city: "Abidjan",
      status: "draft",
      ai_confidence_score: suggestion.confidence_score || 60,
    });

    setSavingIndex(null);

    if (error) {
      setMessage(`Erreur lors de l’enregistrement : ${error.message}`);
      return;
    }

    setSuggestions((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );

    setMessage(
      `Suggestion enregistrée en brouillon pour ${store.name} / ${category.name}.`
    );
  }

  const selectedStore = stores.find((item) => item.id === selectedStoreId);
  const selectedCategory = categories.find(
    (item) => item.id === selectedCategoryId
  );

  return (
    <AdminGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-6xl">
          <a href="/admin" className="text-sm text-emerald-300">
            ← Retour à l’administration
          </a>

          <div className="mt-8">
            <h1 className="text-4xl font-bold">
              Import automatique des promotions
            </h1>
            <p className="mt-2 text-slate-300">
              Scannez les liens web, Facebook ou TikTok d’un magasin pour
              détecter des promotions et les enregistrer en brouillon.
            </p>
          </div>

          {message && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
              {message}
            </div>
          )}

          <div className="mt-8 grid gap-5 rounded-[2rem] border border-white/10 bg-white/5 p-6 md:grid-cols-3">
            <div>
              <label className="text-sm text-slate-300">Magasin</label>
              <select
                value={selectedStoreId}
                onChange={(event) => handleStoreChange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
              >
                <option value="">Sélectionner un magasin</option>

                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-300">
                Catégorie à rechercher
              </label>
              <select
                value={selectedCategoryId}
                onChange={(event) => handleCategoryChange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
              >
                <option value="">Sélectionner une catégorie</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={scanPromotions}
                disabled={isScanning}
                className="w-full rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
              >
                {isScanning ? "Scan en cours..." : "Scanner les promotions"}
              </button>
            </div>
          </div>

          {selectedStore && (
            <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-slate-300">
                Source sélectionnée
              </p>

              <div className="mt-3 grid gap-3 text-sm text-slate-400 md:grid-cols-3">
                <p className="break-all">
                  Site web :{" "}
                  <span className="text-slate-200">
                    {selectedStore.website_url || "Non renseigné"}
                  </span>
                </p>

                <p className="break-all">
                  Facebook :{" "}
                  <span className="text-slate-200">
                    {selectedStore.facebook_url || "Non renseigné"}
                  </span>
                </p>

                <p className="break-all">
                  TikTok :{" "}
                  <span className="text-slate-200">
                    {selectedStore.tiktok_url || "Non renseigné"}
                  </span>
                </p>
              </div>

              {selectedCategory && (
                <p className="mt-3 text-sm text-emerald-300">
                  Filtre appliqué : {selectedStore.name} /{" "}
                  {selectedCategory.name}
                </p>
              )}
            </div>
          )}

          <div className="mt-10 space-y-5">
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.source_url}-${index}`}
                className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
              >
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-3">
                      <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                        {suggestion.source_type}
                      </span>

                      {suggestion.confidence_score && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                          Score {suggestion.confidence_score}%
                        </span>
                      )}

                      {suggestion.discount_percentage && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                          -{suggestion.discount_percentage}%
                        </span>
                      )}

                      {selectedStore && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                          {selectedStore.name}
                        </span>
                      )}

                      {selectedCategory && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                          {selectedCategory.name}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-5 text-xl font-bold">
                      {suggestion.title}
                    </h2>

                    <p className="mt-3 leading-7 text-slate-300">
                      {suggestion.description}
                    </p>

                    {(suggestion.old_price || suggestion.new_price) && (
                      <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        {suggestion.old_price && (
                          <p className="text-slate-400 line-through">
                            Ancien prix : {formatPrice(suggestion.old_price)}
                          </p>
                        )}

                        {suggestion.new_price && (
                          <p className="font-semibold text-emerald-300">
                            Nouveau prix : {formatPrice(suggestion.new_price)}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="mt-4 break-all text-sm text-slate-400">
                      Source : {suggestion.source_url}
                    </p>
                  </div>

                  <button
                    onClick={() => saveSuggestion(suggestion, index)}
                    disabled={savingIndex === index}
                    className="rounded-full bg-white px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
                  >
                    {savingIndex === index
                      ? "Enregistrement..."
                      : "Enregistrer en brouillon"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}