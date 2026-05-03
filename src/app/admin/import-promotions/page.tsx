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
};

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
      const { data: storesData } = await supabase
        .from("stores")
        .select("id, name, website_url, facebook_url, tiktok_url")
        .eq("is_active", true)
        .order("name", { ascending: true });

      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      setStores((storesData || []) as Store[]);
      setCategories((categoriesData || []) as Category[]);
    }

    loadData();
  }, []);

  async function scanPromotions() {
    setMessage("");
    setSuggestions([]);

    const store = stores.find((item) => item.id === selectedStoreId);

    if (!store) {
      setMessage("Veuillez sélectionner un magasin.");
      return;
    }

    if (!store.website_url && !store.facebook_url && !store.tiktok_url) {
      setMessage(
        "Ce magasin n’a aucun lien website, Facebook ou TikTok renseigné."
      );
      return;
    }

    setIsScanning(true);

    const response = await fetch("/api/scrape-promotions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        website_url: store.website_url,
        facebook_url: store.facebook_url,
        tiktok_url: store.tiktok_url,
      }),
    });

    const result = await response.json();

    setIsScanning(false);

    setSuggestions(result.suggestions || []);

    if (!result.suggestions || result.suggestions.length === 0) {
      setMessage(
        "Aucune promotion détectée. Le site peut être protégé ou ne contient pas de texte promotionnel clair."
      );
      return;
    }

    setMessage(`${result.suggestions.length} suggestion(s) détectée(s).`);
  }

  async function saveSuggestion(suggestion: Suggestion, index: number) {
    setMessage("");

    if (!selectedStoreId) {
      setMessage("Veuillez sélectionner un magasin.");
      return;
    }

    if (!selectedCategoryId) {
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
      ai_confidence_score: 60,
    });

    setSavingIndex(null);

    if (error) {
      setMessage(`Erreur lors de l’enregistrement : ${error.message}`);
      return;
    }

    setSuggestions((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setMessage("Suggestion enregistrée en brouillon.");
  }

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
                onChange={(event) => setSelectedStoreId(event.target.value)}
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
                Catégorie par défaut
              </label>
              <select
                value={selectedCategoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
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

                      {suggestion.discount_percentage && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                          -{suggestion.discount_percentage}%
                        </span>
                      )}
                    </div>

                    <h2 className="mt-5 text-xl font-bold">
                      {suggestion.title}
                    </h2>

                    <p className="mt-3 leading-7 text-slate-300">
                      {suggestion.description}
                    </p>

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