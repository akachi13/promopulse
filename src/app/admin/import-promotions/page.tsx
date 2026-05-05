"use client";

import { useEffect, useMemo, useState } from "react";
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

type ExistingDeal = {
  id: string;
  title: string;
  source_url: string | null;
  status: string | null;
};

type Suggestion = {
  local_id: string;
  title: string;
  description: string;
  source_url: string;
  source_type: string;
  image_url?: string;
  discount_percentage: number | null;
  old_price: number | null;
  new_price: number | null;
  confidence_score?: number;
  category_id?: string;
  city?: string;
  valid_until?: string;
  is_duplicate?: boolean;
  duplicate_reason?: string;
  duplicate_deal_id?: string;
};

function formatPrice(price: number | null) {
  if (!price) return null;

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(price);
}

function toNumberOrNull(value: string) {
  if (!value) return null;

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return null;

  return numberValue;
}

function normalizeForCompare(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findDuplicate(
  suggestion: Omit<Suggestion, "local_id">,
  existingDeals: ExistingDeal[]
) {
  const suggestionTitle = normalizeForCompare(suggestion.title);
  const suggestionSourceUrl = normalizeForCompare(suggestion.source_url);

  return existingDeals.find((deal) => {
    const dealTitle = normalizeForCompare(deal.title);
    const dealSourceUrl = normalizeForCompare(deal.source_url);

    const sameSource =
      suggestionSourceUrl.length > 0 &&
      dealSourceUrl.length > 0 &&
      suggestionSourceUrl === dealSourceUrl;

    const sameTitle =
      suggestionTitle.length > 0 &&
      dealTitle.length > 0 &&
      suggestionTitle === dealTitle;

    const closeTitle =
      suggestionTitle.length > 10 &&
      dealTitle.length > 10 &&
      (suggestionTitle.includes(dealTitle) ||
        dealTitle.includes(suggestionTitle));

    return sameSource || sameTitle || closeTitle;
  });
}

function getSourceIcon(sourceType: string) {
  const value = sourceType.toLowerCase();

  if (value.includes("facebook")) return "📘";
  if (value.includes("tiktok")) return "🎵";
  if (value.includes("web")) return "🌐";
  if (value.includes("gemini")) return "✨";

  return "🔎";
}

function getConfidenceLabel(score: number | undefined) {
  if (!score) return "Score IA non défini";
  if (score >= 85) return "Très fiable";
  if (score >= 70) return "Fiable";
  if (score >= 55) return "À vérifier";

  return "Faible confiance";
}

function getConfidenceClass(score: number | undefined) {
  if (!score) return "border-white/10 bg-white/[0.04] text-slate-300";
  if (score >= 85) return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  if (score >= 70) return "border-cyan-400/25 bg-cyan-400/10 text-cyan-300";
  if (score >= 55) return "border-amber-400/25 bg-amber-400/10 text-amber-200";

  return "border-red-400/25 bg-red-400/10 text-red-300";
}

export default function ImportPromotionsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>(
    []
  );
  const [message, setMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

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
    setSelectedSuggestionIds([]);
    setMessage("");
  }

  function handleCategoryChange(categoryId: string) {
    setSelectedCategoryId(categoryId);
    setSuggestions([]);
    setSelectedSuggestionIds([]);
    setMessage("");
  }

  function updateSuggestionField(
    localId: string,
    field: keyof Suggestion,
    value: string | number | boolean | null
  ) {
    setSuggestions((current) =>
      current.map((suggestion) =>
        suggestion.local_id === localId
          ? {
              ...suggestion,
              [field]: value,
            }
          : suggestion
      )
    );
  }

  function toggleSuggestionSelection(localId: string) {
    const suggestion = suggestions.find((item) => item.local_id === localId);

    if (suggestion?.is_duplicate) {
      setMessage(
        "Cette suggestion est marquée comme doublon. Ignorez-la ou modifiez-la manuellement dans une nouvelle promotion."
      );
      return;
    }

    setSelectedSuggestionIds((current) =>
      current.includes(localId)
        ? current.filter((id) => id !== localId)
        : [...current, localId]
    );
  }

  function selectAllSuggestions() {
    const nonDuplicateIds = suggestions
      .filter((suggestion) => !suggestion.is_duplicate)
      .map((suggestion) => suggestion.local_id);

    setSelectedSuggestionIds(nonDuplicateIds);
  }

  function clearSelection() {
    setSelectedSuggestionIds([]);
  }

  function removeDuplicatesFromList() {
    const duplicateIds = suggestions
      .filter((suggestion) => suggestion.is_duplicate)
      .map((suggestion) => suggestion.local_id);

    setSuggestions((current) =>
      current.filter((suggestion) => !suggestion.is_duplicate)
    );

    setSelectedSuggestionIds((current) =>
      current.filter((id) => !duplicateIds.includes(id))
    );

    setMessage("Les suggestions marquées comme doublons ont été retirées.");
  }

  async function scanPromotions() {
    setMessage("");
    setSuggestions([]);
    setSelectedSuggestionIds([]);

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

      const result: {
        suggestions?: Omit<Suggestion, "local_id">[];
        error?: string;
      } = await response.json();

      if (!response.ok) {
        setIsScanning(false);
        setMessage(
          result.error ||
            "Erreur pendant le scan. Vérifiez l’API de scraping ou réessayez."
        );
        return;
      }

      if (result.error) {
        setIsScanning(false);
        setMessage(`Erreur : ${result.error}`);
        return;
      }

      const { data: existingDealsData, error: existingDealsError } =
        await supabase
          .from("deals")
          .select("id, title, source_url, status")
          .eq("store_id", selectedStoreId);

      setIsScanning(false);

      if (existingDealsError) {
        setMessage(
          `Erreur lors de la vérification des doublons : ${existingDealsError.message}`
        );
        return;
      }

      const existingDeals = (existingDealsData || []) as ExistingDeal[];

      const detectedSuggestions: Suggestion[] = (result.suggestions || []).map(
        (suggestion, index) => {
          const duplicate = findDuplicate(suggestion, existingDeals);

          return {
            ...suggestion,
            local_id: `${Date.now()}-${index}`,
            category_id: selectedCategoryId,
            city: "Abidjan",
            valid_until: "",
            image_url: suggestion.image_url || "",
            is_duplicate: Boolean(duplicate),
            duplicate_deal_id: duplicate?.id,
            duplicate_reason: duplicate
              ? `Promotion similaire déjà existante : ${duplicate.title} (${
                  duplicate.status || "statut inconnu"
                })`
              : undefined,
          };
        }
      );

      const nonDuplicateSuggestions = detectedSuggestions.filter(
        (suggestion) => !suggestion.is_duplicate
      );

      const duplicateCount =
        detectedSuggestions.length - nonDuplicateSuggestions.length;

      setSuggestions(detectedSuggestions);
      setSelectedSuggestionIds(
        nonDuplicateSuggestions.map((suggestion) => suggestion.local_id)
      );

      if (detectedSuggestions.length === 0) {
        setMessage(
          `Aucune promotion détectée pour ${store.name} dans la catégorie "${category.name}". Essayez une autre catégorie ou vérifiez le lien du magasin.`
        );
        return;
      }

      setMessage(
        `${detectedSuggestions.length} suggestion(s) détectée(s) pour ${store.name} / ${category.name}. ${duplicateCount} doublon(s) potentiel(s) détecté(s). Les nouvelles suggestions sont sélectionnées automatiquement.`
      );
    } catch {
      setIsScanning(false);
      setMessage(
        "Erreur technique pendant le scan. Le site peut être protégé ou inaccessible."
      );
    }
  }

  function validateSuggestion(suggestion: Suggestion) {
    if (suggestion.is_duplicate) {
      return "Une suggestion sélectionnée est marquée comme doublon.";
    }

    if (!suggestion.title.trim()) {
      return "Une suggestion sélectionnée n’a pas de titre.";
    }

    if (!suggestion.category_id) {
      return "Une suggestion sélectionnée n’a pas de catégorie.";
    }

    return null;
  }

  function buildDealPayload(suggestion: Suggestion) {
    return {
      store_id: selectedStoreId,
      category_id: suggestion.category_id,
      title: suggestion.title,
      description: suggestion.description || null,
      image_url: suggestion.image_url || null,
      old_price: suggestion.old_price,
      new_price: suggestion.new_price,
      discount_percentage: suggestion.discount_percentage,
      source_url: suggestion.source_url,
      source_type: suggestion.source_type,
      valid_from: new Date().toISOString().slice(0, 10),
      valid_until: suggestion.valid_until || null,
      city: suggestion.city || "Abidjan",
      status: "draft",
      ai_confidence_score: suggestion.confidence_score || 60,
    };
  }

  async function saveSuggestion(suggestion: Suggestion) {
    setMessage("");

    const store = stores.find((item) => item.id === selectedStoreId);

    if (!store) {
      setMessage("Veuillez sélectionner un magasin.");
      return;
    }

    const validationError = validateSuggestion(suggestion);

    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSavingId(suggestion.local_id);

    const { error } = await supabase
      .from("deals")
      .insert(buildDealPayload(suggestion));

    setSavingId(null);

    if (error) {
      setMessage(`Erreur lors de l’enregistrement : ${error.message}`);
      return;
    }

    setSuggestions((current) =>
      current.filter((item) => item.local_id !== suggestion.local_id)
    );

    setSelectedSuggestionIds((current) =>
      current.filter((id) => id !== suggestion.local_id)
    );

    setMessage(`Suggestion enregistrée en brouillon pour ${store.name}.`);
  }

  async function saveSelectedSuggestions() {
    setMessage("");

    const store = stores.find((item) => item.id === selectedStoreId);

    if (!store) {
      setMessage("Veuillez sélectionner un magasin.");
      return;
    }

    const selectedSuggestions = suggestions.filter((suggestion) =>
      selectedSuggestionIds.includes(suggestion.local_id)
    );

    if (selectedSuggestions.length === 0) {
      setMessage("Veuillez sélectionner au moins une suggestion non doublon.");
      return;
    }

    for (const suggestion of selectedSuggestions) {
      const validationError = validateSuggestion(suggestion);

      if (validationError) {
        setMessage(validationError);
        return;
      }
    }

    setIsBulkSaving(true);

    const payload = selectedSuggestions.map((suggestion) =>
      buildDealPayload(suggestion)
    );

    const { error } = await supabase.from("deals").insert(payload);

    setIsBulkSaving(false);

    if (error) {
      setMessage(`Erreur lors de l’enregistrement groupé : ${error.message}`);
      return;
    }

    const savedIds = selectedSuggestions.map(
      (suggestion) => suggestion.local_id
    );

    setSuggestions((current) =>
      current.filter((suggestion) => !savedIds.includes(suggestion.local_id))
    );

    setSelectedSuggestionIds([]);

    setMessage(
      `${selectedSuggestions.length} suggestion(s) enregistrée(s) en brouillon pour ${store.name}.`
    );
  }

  function removeSuggestion(localId: string) {
    setSuggestions((current) =>
      current.filter((suggestion) => suggestion.local_id !== localId)
    );

    setSelectedSuggestionIds((current) =>
      current.filter((id) => id !== localId)
    );
  }

  const selectedStore = stores.find((item) => item.id === selectedStoreId);
  const selectedCategory = categories.find(
    (item) => item.id === selectedCategoryId
  );

  const nonDuplicateSuggestions = suggestions.filter(
    (suggestion) => !suggestion.is_duplicate
  );

  const duplicateSuggestions = suggestions.filter(
    (suggestion) => suggestion.is_duplicate
  );

  const allSelected =
    nonDuplicateSuggestions.length > 0 &&
    selectedSuggestionIds.length === nonDuplicateSuggestions.length;

  const hasStoreSources =
    selectedStore &&
    (selectedStore.website_url ||
      selectedStore.facebook_url ||
      selectedStore.tiktok_url);

  const scanProgressText = useMemo(() => {
    if (isScanning) return "Gemini analyse les sources du magasin...";
    if (suggestions.length > 0) return "Suggestions prêtes à valider.";
    if (selectedStore && selectedCategory) return "Prêt pour le scan.";

    return "Sélectionnez un magasin et une catégorie.";
  }, [isScanning, suggestions.length, selectedStore, selectedCategory]);

  return (
    <AdminGuard>
      <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute left-1/2 top-[-20rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[150px]" />
          <div className="absolute right-[-14rem] top-56 h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-[130px]" />
          <div className="absolute bottom-[-14rem] left-[-14rem] h-[34rem] w-[34rem] rounded-full bg-emerald-700/15 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-8">
          <header className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <a
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
            >
              ← Retour à l’administration
            </a>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/admin/deals"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                🔥 Promotions
              </a>

              <a
                href="/admin/stores"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                🏬 Magasins
              </a>

              <a
                href="/admin/categories"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                🏷️ Catégories
              </a>
            </div>
          </header>

          {message && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-slate-200 backdrop-blur-xl">
              {message}
            </div>
          )}

          <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-2xl backdrop-blur-2xl md:p-9">
              <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,.8)]" />
                  Import intelligent avec Gemini
                </span>

                <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Détectez les{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                    promotions
                  </span>{" "}
                  automatiquement.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Sélectionnez un magasin, choisissez une catégorie, lancez
                  l’analyse Gemini, corrigez les suggestions, retirez les
                  doublons et enregistrez les nouvelles offres en brouillon.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Suggestions</p>
                    <p className="mt-2 text-4xl font-black">
                      {suggestions.length}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <p className="text-sm text-emerald-200">Nouvelles</p>
                    <p className="mt-2 text-4xl font-black text-emerald-300">
                      {nonDuplicateSuggestions.length}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5">
                    <p className="text-sm text-red-200">Doublons</p>
                    <p className="mt-2 text-4xl font-black text-red-300">
                      {duplicateSuggestions.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-7 shadow-2xl shadow-emerald-950/30 backdrop-blur-2xl">
              <div className="absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-emerald-300/20 blur-3xl" />

              <div className="relative flex h-full flex-col justify-between gap-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                    Statut du scan
                  </p>

                  <h2 className="mt-4 text-3xl font-black">
                    {isScanning ? "Analyse en cours..." : "Pipeline IA"}
                  </h2>

                  <p className="mt-4 leading-7 text-emerald-100">
                    {scanProgressText}
                  </p>

                  <div className="mt-7 space-y-3">
                    {["Scanner", "Détecter", "Corriger", "Sauvegarder"].map(
                      (item, index) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-slate-950/40 p-3"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-slate-950">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-white">
                            {item}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                  <p className="text-sm font-bold text-white">
                    Résultat attendu
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    Les promotions validées sont enregistrées en brouillon, puis
                    publiées depuis la gestion des promotions.
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Magasin à scanner
                </label>

                <select
                  value={selectedStoreId}
                  onChange={(event) => handleStoreChange(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
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
                <label className="text-sm font-semibold text-slate-300">
                  Catégorie cible
                </label>

                <select
                  value={selectedCategoryId}
                  onChange={(event) =>
                    handleCategoryChange(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                >
                  <option value="">Sélectionner une catégorie</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={scanPromotions}
                disabled={isScanning}
                className="rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-300 px-7 py-4 font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isScanning ? "Analyse Gemini..." : "Scanner avec Gemini"}
              </button>
            </div>
          </section>

          {selectedStore && (
            <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                    Source sélectionnée
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    {selectedStore.name}
                  </h2>

                  {selectedCategory && (
                    <p className="mt-2 text-sm text-slate-400">
                      Catégorie recherchée :{" "}
                      <span className="font-semibold text-emerald-300">
                        {selectedCategory.name}
                      </span>
                    </p>
                  )}
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-black ${
                    hasStoreSources
                      ? "bg-emerald-400 text-slate-950"
                      : "border border-red-400/30 bg-red-400/10 text-red-300"
                  }`}
                >
                  {hasStoreSources ? "Sources disponibles" : "Aucune source"}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Site web</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-200">
                    {selectedStore.website_url || "Non renseigné"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Facebook</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-200">
                    {selectedStore.facebook_url || "Non renseigné"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">TikTok</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-200">
                    {selectedStore.tiktok_url || "Non renseigné"}
                  </p>
                </div>
              </div>
            </section>
          )}

          {suggestions.length > 0 && (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                    Suggestions détectées
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    Validation avant brouillon
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {selectedSuggestionIds.length}/
                    {nonDuplicateSuggestions.length} nouvelle(s) suggestion(s)
                    sélectionnée(s). {duplicateSuggestions.length} doublon(s)
                    potentiel(s) détecté(s).
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {duplicateSuggestions.length > 0 && (
                    <button
                      type="button"
                      onClick={removeDuplicatesFromList}
                      className="rounded-full border border-red-400/40 bg-red-400/10 px-5 py-2.5 font-bold text-red-300 transition hover:bg-red-400/20"
                    >
                      Retirer les doublons
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={allSelected ? clearSelection : selectAllSuggestions}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 font-bold text-white transition hover:bg-white/[0.08]"
                  >
                    {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>

                  <button
                    type="button"
                    onClick={saveSelectedSuggestions}
                    disabled={isBulkSaving || selectedSuggestionIds.length === 0}
                    className="rounded-full bg-emerald-400 px-5 py-2.5 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isBulkSaving
                      ? "Enregistrement..."
                      : "Enregistrer la sélection"}
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="mt-10 space-y-6">
            {suggestions.map((suggestion, index) => {
              const isSelected = selectedSuggestionIds.includes(
                suggestion.local_id
              );

              return (
                <article
                  key={suggestion.local_id}
                  className={`group overflow-hidden rounded-[2rem] border shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/30 ${
                    suggestion.is_duplicate
                      ? "border-red-400/35 bg-red-400/10"
                      : isSelected
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/10 bg-white/[0.04] hover:border-emerald-400/30 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
                    <div className="relative min-h-72 overflow-hidden bg-slate-950">
                      {suggestion.image_url ? (
                        <img
                          src={suggestion.image_url}
                          alt={suggestion.title}
                          className="h-full min-h-72 w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full min-h-72 items-center justify-center bg-gradient-to-br from-emerald-400/20 via-slate-900 to-slate-950">
                          <span className="text-sm font-black text-emerald-300">
                            PromoPulse IA
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />

                      <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs font-black text-slate-200 backdrop-blur-xl">
                          {getSourceIcon(suggestion.source_type)}{" "}
                          {suggestion.source_type}
                        </span>

                        <span
                          className={`rounded-full border px-4 py-2 text-xs font-black backdrop-blur-xl ${getConfidenceClass(
                            suggestion.confidence_score
                          )}`}
                        >
                          {getConfidenceLabel(suggestion.confidence_score)}
                          {suggestion.confidence_score
                            ? ` · ${suggestion.confidence_score}%`
                            : ""}
                        </span>

                        {suggestion.is_duplicate ? (
                          <span className="rounded-full border border-red-400/30 bg-red-400/20 px-4 py-2 text-xs font-black text-red-200 backdrop-blur-xl">
                            Doublon
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950">
                            Nouveau draft
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-5 left-5 right-5">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
                          Suggestion #{index + 1}
                        </p>

                        <h3 className="mt-2 line-clamp-2 text-2xl font-black">
                          {suggestion.title || "Titre non renseigné"}
                        </h3>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div className="flex flex-wrap gap-3">
                          {selectedStore && (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300">
                              {selectedStore.name}
                            </span>
                          )}

                          {selectedCategory && (
                            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                              {selectedCategory.name}
                            </span>
                          )}

                          {suggestion.discount_percentage && (
                            <span className="rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-black text-slate-950">
                              -{suggestion.discount_percentage}%
                            </span>
                          )}
                        </div>

                        <label className="flex cursor-pointer items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/[0.08]">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={suggestion.is_duplicate}
                            onChange={() =>
                              toggleSuggestionSelection(suggestion.local_id)
                            }
                            className="h-4 w-4"
                          />
                          Sélectionner
                        </label>
                      </div>

                      {suggestion.duplicate_reason && (
                        <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-200">
                          {suggestion.duplicate_reason}
                        </div>
                      )}

                      <div className="mt-6 grid gap-5 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-semibold text-slate-300">
                            Titre
                          </label>

                          <input
                            value={suggestion.title}
                            onChange={(event) =>
                              updateSuggestionField(
                                suggestion.local_id,
                                "title",
                                event.target.value
                              )
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-slate-300">
                            Catégorie
                          </label>

                          <select
                            value={suggestion.category_id || ""}
                            onChange={(event) =>
                              updateSuggestionField(
                                suggestion.local_id,
                                "category_id",
                                event.target.value
                              )
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                          >
                            <option value="">Sélectionner une catégorie</option>

                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-5">
                        <label className="text-sm font-semibold text-slate-300">
                          Description
                        </label>

                        <textarea
                          value={suggestion.description}
                          onChange={(event) =>
                            updateSuggestionField(
                              suggestion.local_id,
                              "description",
                              event.target.value
                            )
                          }
                          rows={4}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                        />
                      </div>

                      <div className="mt-5">
                        <label className="text-sm font-semibold text-slate-300">
                          Image de la promotion
                        </label>

                        <input
                          value={suggestion.image_url || ""}
                          onChange={(event) =>
                            updateSuggestionField(
                              suggestion.local_id,
                              "image_url",
                              event.target.value
                            )
                          }
                          placeholder="https://exemple.com/image-promotion.jpg"
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                        />
                      </div>

                      <div className="mt-5 grid gap-5 md:grid-cols-3">
                        <div>
                          <label className="text-sm font-semibold text-slate-300">
                            Ancien prix
                          </label>

                          <input
                            type="number"
                            value={suggestion.old_price ?? ""}
                            onChange={(event) =>
                              updateSuggestionField(
                                suggestion.local_id,
                                "old_price",
                                toNumberOrNull(event.target.value)
                              )
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                          />

                          {suggestion.old_price && (
                            <p className="mt-1 text-xs text-slate-500 line-through">
                              {formatPrice(suggestion.old_price)}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-slate-300">
                            Nouveau prix
                          </label>

                          <input
                            type="number"
                            value={suggestion.new_price ?? ""}
                            onChange={(event) =>
                              updateSuggestionField(
                                suggestion.local_id,
                                "new_price",
                                toNumberOrNull(event.target.value)
                              )
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                          />

                          {suggestion.new_price && (
                            <p className="mt-1 text-xs font-semibold text-emerald-300">
                              {formatPrice(suggestion.new_price)}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-slate-300">
                            Réduction %
                          </label>

                          <input
                            type="number"
                            value={suggestion.discount_percentage ?? ""}
                            onChange={(event) =>
                              updateSuggestionField(
                                suggestion.local_id,
                                "discount_percentage",
                                toNumberOrNull(event.target.value)
                              )
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                          />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-semibold text-slate-300">
                            Ville
                          </label>

                          <input
                            value={suggestion.city || "Abidjan"}
                            onChange={(event) =>
                              updateSuggestionField(
                                suggestion.local_id,
                                "city",
                                event.target.value
                              )
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-slate-300">
                            Date de fin
                          </label>

                          <input
                            type="date"
                            value={suggestion.valid_until || ""}
                            onChange={(event) =>
                              updateSuggestionField(
                                suggestion.local_id,
                                "valid_until",
                                event.target.value
                              )
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                          />
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                        <p className="text-xs text-slate-500">Source</p>
                        <p className="mt-1 break-all text-sm text-slate-300">
                          {suggestion.source_url}
                        </p>
                      </div>

                      <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row">
                        <button
                          onClick={() => saveSuggestion(suggestion)}
                          disabled={
                            savingId === suggestion.local_id ||
                            suggestion.is_duplicate
                          }
                          className="flex-1 rounded-full bg-emerald-400 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingId === suggestion.local_id
                            ? "Enregistrement..."
                            : "Enregistrer seul"}
                        </button>

                        <button
                          type="button"
                          onClick={() => removeSuggestion(suggestion.local_id)}
                          className="flex-1 rounded-full border border-red-400/40 bg-red-400/10 px-5 py-3 font-bold text-red-300 transition hover:bg-red-400/20"
                        >
                          Ignorer
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}