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
  local_id: string;
  title: string;
  description: string;
  source_url: string;
  source_type: string;
  discount_percentage: number | null;
  old_price: number | null;
  new_price: number | null;
  confidence_score?: number;
  category_id?: string;
  city?: string;
  valid_until?: string;
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
    value: string | number | null
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
    setSelectedSuggestionIds((current) =>
      current.includes(localId)
        ? current.filter((id) => id !== localId)
        : [...current, localId]
    );
  }

  function selectAllSuggestions() {
    setSelectedSuggestionIds(suggestions.map((suggestion) => suggestion.local_id));
  }

  function clearSelection() {
    setSelectedSuggestionIds([]);
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

      setIsScanning(false);

      if (!response.ok) {
        setMessage(
          result.error ||
            "Erreur pendant le scan. Vérifiez l’API de scraping ou réessayez."
        );
        return;
      }

      if (result.error) {
        setMessage(`Erreur : ${result.error}`);
        return;
      }

      const detectedSuggestions: Suggestion[] = (result.suggestions || []).map(
        (suggestion, index) => ({
          ...suggestion,
          local_id: `${Date.now()}-${index}`,
          category_id: selectedCategoryId,
          city: "Abidjan",
          valid_until: "",
        })
      );

      setSuggestions(detectedSuggestions);
      setSelectedSuggestionIds(
        detectedSuggestions.map((suggestion) => suggestion.local_id)
      );

      if (detectedSuggestions.length === 0) {
        setMessage(
          `Aucune promotion détectée pour ${store.name} dans la catégorie "${category.name}". Essayez une autre catégorie ou vérifiez le lien du magasin.`
        );
        return;
      }

      setMessage(
        `${detectedSuggestions.length} suggestion(s) détectée(s) pour ${store.name} / ${category.name}. Elles sont sélectionnées par défaut et seront enregistrées en brouillon.`
      );
    } catch {
      setIsScanning(false);
      setMessage(
        "Erreur technique pendant le scan. Le site peut être protégé ou inaccessible."
      );
    }
  }

  function validateSuggestion(suggestion: Suggestion) {
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
      setMessage("Veuillez sélectionner au moins une suggestion.");
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

    const savedIds = selectedSuggestions.map((suggestion) => suggestion.local_id);

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

  const allSelected =
    suggestions.length > 0 && selectedSuggestionIds.length === suggestions.length;

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
              Scannez les liens web, Facebook ou TikTok d’un magasin, corrigez
              les suggestions, puis enregistrez-les en brouillon.
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
                {isScanning ? "Analyse Gemini en cours..." : "Scanner"}
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

          {suggestions.length > 0 && (
            <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-xl font-bold">Suggestions détectées</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedSuggestionIds.length}/{suggestions.length}{" "}
                    suggestion(s) sélectionnée(s). L’enregistrement groupé crée
                    des promotions en brouillon.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={allSelected ? clearSelection : selectAllSuggestions}
                    className="rounded-full border border-white/20 px-5 py-2.5 font-semibold text-white transition hover:bg-white/10"
                  >
                    {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>

                  <button
                    type="button"
                    onClick={saveSelectedSuggestions}
                    disabled={isBulkSaving || selectedSuggestionIds.length === 0}
                    className="rounded-full bg-emerald-400 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                  >
                    {isBulkSaving
                      ? "Enregistrement..."
                      : "Enregistrer la sélection"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-10 space-y-6">
            {suggestions.map((suggestion) => {
              const isSelected = selectedSuggestionIds.includes(
                suggestion.local_id
              );

              return (
                <div
                  key={suggestion.local_id}
                  className={`rounded-[2rem] border p-6 ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div className="flex flex-wrap gap-3">
                      <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                        {suggestion.source_type}
                      </span>

                      {suggestion.confidence_score && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                          Score {suggestion.confidence_score}%
                        </span>
                      )}

                      {selectedStore && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                          {selectedStore.name}
                        </span>
                      )}

                      <span className="rounded-full bg-amber-400/20 px-3 py-1 text-sm text-amber-200">
                        draft
                      </span>
                    </div>

                    <label className="flex cursor-pointer items-center gap-3 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          toggleSuggestionSelection(suggestion.local_id)
                        }
                        className="h-4 w-4"
                      />
                      Sélectionner
                    </label>
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="text-sm text-slate-300">Titre</label>
                      <input
                        value={suggestion.title}
                        onChange={(event) =>
                          updateSuggestionField(
                            suggestion.local_id,
                            "title",
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-slate-300">Catégorie</label>
                      <select
                        value={suggestion.category_id || ""}
                        onChange={(event) =>
                          updateSuggestionField(
                            suggestion.local_id,
                            "category_id",
                            event.target.value
                          )
                        }
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
                  </div>

                  <div className="mt-5">
                    <label className="text-sm text-slate-300">Description</label>
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
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-3">
                    <div>
                      <label className="text-sm text-slate-300">
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
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                      />
                      {suggestion.old_price && (
                        <p className="mt-1 text-xs text-slate-400 line-through">
                          {formatPrice(suggestion.old_price)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm text-slate-300">
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
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                      />
                      {suggestion.new_price && (
                        <p className="mt-1 text-xs font-semibold text-emerald-300">
                          {formatPrice(suggestion.new_price)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm text-slate-300">
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
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="text-sm text-slate-300">Ville</label>
                      <input
                        value={suggestion.city || "Abidjan"}
                        onChange={(event) =>
                          updateSuggestionField(
                            suggestion.local_id,
                            "city",
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-slate-300">
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
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <p className="mt-5 break-all text-sm text-slate-400">
                    Source : {suggestion.source_url}
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => saveSuggestion(suggestion)}
                      disabled={savingId === suggestion.local_id}
                      className="flex-1 rounded-full bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                    >
                      {savingId === suggestion.local_id
                        ? "Enregistrement..."
                        : "Enregistrer seul"}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeSuggestion(suggestion.local_id)}
                      className="flex-1 rounded-full border border-red-400/40 px-5 py-3 font-semibold text-red-300 transition hover:bg-red-400/10"
                    >
                      Ignorer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}