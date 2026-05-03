"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import AdminGuard from "../../../../../components/AdminGuard";

type Store = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
};

export default function EditDealPage() {
  const params = useParams();
  const router = useRouter();

  const dealIdParam = params.id;
  const dealId = Array.isArray(dealIdParam) ? dealIdParam[0] : dealIdParam;

  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    image_url: "",
    store_id: "",
    category_id: "",
    old_price: "",
    new_price: "",
    discount_percentage: "",
    valid_until: "",
    city: "Abidjan",
    status: "draft",
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!dealId) {
        setMessage("Identifiant de promotion introuvable.");
        setIsLoading(false);
        return;
      }

      const { data: storesData, error: storesError } = await supabase
        .from("stores")
        .select("id, name")
        .order("name", { ascending: true });

      if (storesError) {
        setMessage(`Erreur magasins : ${storesError.message}`);
        setIsLoading(false);
        return;
      }

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });

      if (categoriesError) {
        setMessage(`Erreur catégories : ${categoriesError.message}`);
        setIsLoading(false);
        return;
      }

      const { data: dealData, error: dealError } = await supabase
        .from("deals")
        .select(
          `
          title,
          description,
          image_url,
          store_id,
          category_id,
          old_price,
          new_price,
          discount_percentage,
          valid_until,
          city,
          status
        `
        )
        .eq("id", dealId)
        .single();

      if (dealError) {
        setMessage(`Erreur lors du chargement : ${dealError.message}`);
        setIsLoading(false);
        return;
      }

      setStores((storesData || []) as Store[]);
      setCategories((categoriesData || []) as Category[]);

      setForm({
        title: dealData.title || "",
        description: dealData.description || "",
        image_url: dealData.image_url || "",
        store_id: dealData.store_id || "",
        category_id: dealData.category_id || "",
        old_price:
          dealData.old_price !== null && dealData.old_price !== undefined
            ? String(dealData.old_price)
            : "",
        new_price:
          dealData.new_price !== null && dealData.new_price !== undefined
            ? String(dealData.new_price)
            : "",
        discount_percentage:
          dealData.discount_percentage !== null &&
          dealData.discount_percentage !== undefined
            ? String(dealData.discount_percentage)
            : "",
        valid_until: dealData.valid_until || "",
        city: dealData.city || "Abidjan",
        status: dealData.status || "draft",
      });

      setIsLoading(false);
    }

    loadData();
  }, [dealId]);

  function updateField(name: string, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dealId) {
      setMessage("Identifiant de promotion introuvable.");
      return;
    }

    setMessage("");
    setIsSaving(true);

    const { error } = await supabase
      .from("deals")
      .update({
        title: form.title,
        description: form.description || null,
        image_url: form.image_url || null,
        store_id: form.store_id || null,
        category_id: form.category_id || null,
        old_price: form.old_price ? Number(form.old_price) : null,
        new_price: form.new_price ? Number(form.new_price) : null,
        discount_percentage: form.discount_percentage
          ? Number(form.discount_percentage)
          : null,
        valid_until: form.valid_until || null,
        city: form.city || "Abidjan",
        status: form.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId);

    setIsSaving(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setMessage("Promotion modifiée avec succès.");
  }

  if (isLoading) {
    return (
      <AdminGuard>
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-slate-300">Chargement de la promotion...</p>
          </div>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <a href="/admin/deals" className="text-sm text-emerald-300">
            ← Retour aux promotions
          </a>

          <h1 className="mt-8 text-4xl font-bold">Modifier la promotion</h1>

          <p className="mt-2 text-slate-300">
            Modifiez les informations de l’offre promotionnelle sélectionnée.
          </p>

          {message && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
              {message}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5 rounded-[2rem] border border-white/10 bg-white/5 p-6"
          >
            <div>
              <label className="text-sm text-slate-300">Titre de l’offre</label>

              <input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Description</label>

              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">
                Image de la promotion
              </label>

              <input
                value={form.image_url}
                onChange={(e) => updateField("image_url", e.target.value)}
                placeholder="https://exemple.com/image-promotion.jpg"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
              />

              {form.image_url && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                  <img
                    src={form.image_url}
                    alt="Aperçu promotion"
                    className="h-48 w-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm text-slate-300">Magasin</label>

                <select
                  value={form.store_id}
                  onChange={(e) => updateField("store_id", e.target.value)}
                  required
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
                <label className="text-sm text-slate-300">Catégorie</label>

                <select
                  value={form.category_id}
                  onChange={(e) => updateField("category_id", e.target.value)}
                  required
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

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="text-sm text-slate-300">Ancien prix</label>

                <input
                  type="number"
                  value={form.old_price}
                  onChange={(e) => updateField("old_price", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">Nouveau prix</label>

                <input
                  type="number"
                  value={form.new_price}
                  onChange={(e) => updateField("new_price", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">Réduction (%)</label>

                <input
                  type="number"
                  value={form.discount_percentage}
                  onChange={(e) =>
                    updateField("discount_percentage", e.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="text-sm text-slate-300">Ville</label>

                <input
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">Date de fin</label>

                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => updateField("valid_until", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">Statut</label>

                <select
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="expired">expired</option>
                  <option value="archived">archived</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                disabled={isSaving}
                className="flex-1 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
              >
                {isSaving
                  ? "Enregistrement..."
                  : "Enregistrer les modifications"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/admin/deals")}
                className="flex-1 rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Retour
              </button>
            </div>
          </form>
        </div>
      </main>
    </AdminGuard>
  );
}