"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import AdminGuard from "../../../../components/AdminGuard";

type Store = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
};

export default function NewDealPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    store_id: "",
    category_id: "",
    old_price: "",
    new_price: "",
    discount_percentage: "",
    valid_until: "",
    city: "Abidjan",
  });

  useEffect(() => {
    async function loadData() {
      const { data: storesData } = await supabase
        .from("stores")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      setStores((storesData as Store[]) || []);
      setCategories((categoriesData as Category[]) || []);
    }

    loadData();
  }, []);

  function updateField(name: string, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    const { error } = await supabase.from("deals").insert({
      title: form.title,
      description: form.description,
      store_id: form.store_id || null,
      category_id: form.category_id || null,
      old_price: form.old_price ? Number(form.old_price) : null,
      new_price: form.new_price ? Number(form.new_price) : null,
      discount_percentage: form.discount_percentage
        ? Number(form.discount_percentage)
        : null,
      valid_from: new Date().toISOString().slice(0, 10),
      valid_until: form.valid_until || null,
      city: form.city,
      source_type: "manual",
      status: "published",
    });

    setIsLoading(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setMessage("Promotion ajoutée avec succès.");

    setForm({
      title: "",
      description: "",
      store_id: "",
      category_id: "",
      old_price: "",
      new_price: "",
      discount_percentage: "",
      valid_until: "",
      city: "Abidjan",
    });
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <a href="/admin" className="text-sm text-emerald-300">
            ← Retour à l’administration
          </a>

          <h1 className="mt-8 text-4xl font-bold">Ajouter une promotion</h1>

          <p className="mt-2 text-slate-300">
            Créez une nouvelle offre qui sera affichée sur la page des
            promotions.
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
              <label className="text-sm text-slate-300">
                Titre de l’offre
              </label>

              <input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                required
                placeholder="Ex : Riz 25 kg en promotion"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Description</label>

              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
                placeholder="Décrivez la promotion"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
              />
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
                  placeholder="18000"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">Nouveau prix</label>

                <input
                  type="number"
                  value={form.new_price}
                  onChange={(e) => updateField("new_price", e.target.value)}
                  placeholder="14500"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">
                  Réduction (%)
                </label>

                <input
                  type="number"
                  value={form.discount_percentage}
                  onChange={(e) =>
                    updateField("discount_percentage", e.target.value)
                  }
                  placeholder="20"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
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
            </div>

            <button
              disabled={isLoading}
              className="w-full rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
            >
              {isLoading ? "Ajout en cours..." : "Ajouter la promotion"}
            </button>
          </form>
        </div>
      </main>
    </AdminGuard>
  );
}