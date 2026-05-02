"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean | null;
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, is_active")
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(
          `Erreur lors du chargement des catégories : ${error.message}`
        );
        setIsLoading(false);
        return;
      }

      setCategories((data || []) as Category[]);
      setIsLoading(false);
    }

    loadCategories();
  }, []);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <a href="/admin" className="text-sm text-emerald-300">
            ← Retour à l’administration
          </a>

          <div className="mt-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold">Gestion des catégories</h1>
              <p className="mt-2 text-slate-300">
                Ajoutez et consultez les catégories utilisées pour classer les
                promotions.
              </p>
            </div>

            <a
              href="/admin/categories/new"
              className="inline-flex rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Ajouter une catégorie
            </a>
          </div>

          {isLoading && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Chargement des catégories...
            </div>
          )}

          {message && (
            <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
              {message}
            </div>
          )}

          {!isLoading && categories.length === 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Aucune catégorie enregistrée pour le moment.
            </div>
          )}

          {!isLoading && categories.length > 0 && (
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-400/20" />

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        category.is_active
                          ? "bg-emerald-400/20 text-emerald-300"
                          : "bg-red-400/20 text-red-300"
                      }`}
                    >
                      {category.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <h2 className="mt-5 text-xl font-semibold">
                    {category.name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {category.slug}
                  </p>

                  <p className="mt-4 leading-7 text-slate-300">
                    {category.description || "Aucune description."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}