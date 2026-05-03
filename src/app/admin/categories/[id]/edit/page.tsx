"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import AdminGuard from "../../../../../components/AdminGuard";

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();

  const categoryId = params.id as string;

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    is_active: true,
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadCategory() {
      const { data, error } = await supabase
        .from("categories")
        .select("name, slug, description, is_active")
        .eq("id", categoryId)
        .single();

      if (error) {
        setMessage(`Erreur lors du chargement : ${error.message}`);
        setIsLoading(false);
        return;
      }

      setForm({
        name: data.name || "",
        slug: data.slug || "",
        description: data.description || "",
        is_active: data.is_active ?? true,
      });

      setIsLoading(false);
    }

    loadCategory();
  }, [categoryId]);

  function updateField(name: string, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleNameChange(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: generateSlug(value),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const { error } = await supabase
      .from("categories")
      .update({
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        is_active: form.is_active,
      })
      .eq("id", categoryId);

    setIsSaving(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setMessage("Catégorie modifiée avec succès.");
  }

  if (isLoading) {
    return (
      <AdminGuard>
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-slate-300">Chargement de la catégorie...</p>
          </div>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <a href="/admin/categories" className="text-sm text-emerald-300">
            ← Retour aux catégories
          </a>

          <h1 className="mt-8 text-4xl font-bold">Modifier la catégorie</h1>

          <p className="mt-2 text-slate-300">
            Modifiez les informations de la catégorie sélectionnée.
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
                Nom de la catégorie
              </label>

              <input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Slug</label>

              <input
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
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

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold">Catégorie active</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Une catégorie active est visible par les utilisateurs.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => updateField("is_active", !form.is_active)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                    form.is_active
                      ? "bg-emerald-400 text-slate-950"
                      : "bg-white/10 text-white"
                  }`}
                >
                  {form.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                disabled={isSaving}
                className="flex-1 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/admin/categories")}
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