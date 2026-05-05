"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type StatusFilter = "all" | "active" | "inactive";

function formatDate(date: string | null) {
  if (!date) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function getStatusClass(isActive: boolean | null) {
  if (isActive) {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }

  return "border-red-400/25 bg-red-400/10 text-red-300";
}

function getStatusLabel(isActive: boolean | null) {
  return isActive ? "Active" : "Inactive";
}

function getCategoryIcon(index: number) {
  const icons = ["🏷️", "🛒", "🍽️", "📱", "👗", "🏠", "💄", "⚡", "🎁", "🧴"];
  return icons[index % icons.length];
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  async function loadCategories() {
    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, description, is_active, created_at")
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

  useEffect(() => {
    loadCategories();
  }, []);

  async function updateCategoryStatus(
    categoryId: string,
    categoryName: string,
    isActive: boolean
  ) {
    setMessage("");
    setUpdatingId(categoryId);

    const { error } = await supabase
      .from("categories")
      .update({
        is_active: isActive,
      })
      .eq("id", categoryId);

    setUpdatingId(null);

    if (error) {
      setMessage(`Erreur lors du changement de statut : ${error.message}`);
      return;
    }

    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? { ...category, is_active: isActive }
          : category
      )
    );

    setMessage(
      `La catégorie "${categoryName}" est maintenant ${
        isActive ? "active" : "inactive"
      }.`
    );
  }

  async function deleteCategory(categoryId: string, categoryName: string) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la catégorie "${categoryName}" ?`
    );

    if (!confirmed) return;

    setMessage("");
    setDeletingId(categoryId);

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    setDeletingId(null);

    if (error) {
      setMessage(`Erreur lors de la suppression : ${error.message}`);
      return;
    }

    setCategories((current) =>
      current.filter((category) => category.id !== categoryId)
    );

    setMessage("Catégorie supprimée avec succès.");
  }

  const stats = useMemo(() => {
    return {
      all: categories.length,
      active: categories.filter((category) => category.is_active).length,
      inactive: categories.filter((category) => !category.is_active).length,
      described: categories.filter(
        (category) => category.description && category.description.trim()
      ).length,
    };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const normalizedSearch = search.toLowerCase().trim();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        category.name.toLowerCase().includes(normalizedSearch) ||
        category.slug.toLowerCase().includes(normalizedSearch) ||
        (category.description || "")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && category.is_active) ||
        (statusFilter === "inactive" && !category.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  const latestCategory = categories[0] || null;

  const filters = [
    {
      key: "all",
      label: "Toutes",
      count: stats.all,
      icon: "🏷️",
    },
    {
      key: "active",
      label: "Actives",
      count: stats.active,
      icon: "✅",
    },
    {
      key: "inactive",
      label: "Inactives",
      count: stats.inactive,
      icon: "⛔",
    },
  ] as const;

  if (isLoading) {
    return (
      <AdminGuard>
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6 text-white">
          <div className="pointer-events-none fixed inset-0">
            <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[130px]" />
            <div className="absolute bottom-[-12rem] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-emerald-700/15 blur-[120px]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
          </div>

          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 text-center shadow-2xl backdrop-blur-2xl">
            <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-emerald-400/30" />
            <p className="mt-5 text-slate-300">
              Chargement des catégories...
            </p>
          </div>
        </main>
      </AdminGuard>
    );
  }

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
              <button
                onClick={loadCategories}
                disabled={isLoading}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Actualisation..." : "Actualiser"}
              </button>

              <a
                href="/admin/deals"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                🔥 Promotions
              </a>

              <a
                href="/admin/categories/new"
                className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5"
              >
                + Ajouter une catégorie
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
                  Gestion des catégories
                </span>

                <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Organisez vos{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                    promotions
                  </span>{" "}
                  par univers.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Créez, modifiez, activez ou désactivez les catégories utilisées
                  pour classer les promotions et personnaliser les
                  recommandations utilisateurs.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Total catégories</p>
                    <p className="mt-2 text-4xl font-black">{stats.all}</p>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <p className="text-sm text-emerald-200">Actives</p>
                    <p className="mt-2 text-4xl font-black text-emerald-300">
                      {stats.active}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5">
                    <p className="text-sm text-red-200">Inactives</p>
                    <p className="mt-2 text-4xl font-black text-red-300">
                      {stats.inactive}
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
                    Dernière catégorie
                  </p>

                  {latestCategory ? (
                    <>
                      <div className="mt-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-emerald-400 to-teal-300 text-3xl shadow-lg shadow-emerald-500/20">
                        {getCategoryIcon(0)}
                      </div>

                      <h2 className="mt-5 text-3xl font-black">
                        {latestCategory.name}
                      </h2>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-4 py-2 text-sm font-bold ${getStatusClass(
                            latestCategory.is_active
                          )}`}
                        >
                          {getStatusLabel(latestCategory.is_active)}
                        </span>

                        <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                          /{latestCategory.slug}
                        </span>
                      </div>

                      <p className="mt-5 text-sm leading-6 text-emerald-100">
                        Création :{" "}
                        <span className="font-bold text-white">
                          {formatDate(latestCategory.created_at)}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-4 text-3xl font-black">
                        Aucune catégorie
                      </h2>

                      <p className="mt-4 leading-7 text-emerald-100">
                        Ajoutez votre première catégorie pour commencer à mieux
                        classifier les promotions.
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                  <p className="text-sm font-bold text-white">
                    Personnalisation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    Les catégories actives peuvent être suivies par les
                    utilisateurs et utilisées dans le ciblage des promotions.
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {filters.map((item) => {
              const isActive = statusFilter === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key)}
                  className={`group rounded-[1.75rem] border p-5 text-left backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/30 ${
                    isActive
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/10 bg-white/[0.04] hover:border-emerald-400/30 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-xl">
                      {item.icon}
                    </div>

                    <span className="text-slate-600 transition group-hover:text-emerald-300">
                      →
                    </span>
                  </div>

                  <p className="mt-5 text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-4xl font-black">{item.count}</p>
                </button>
              );
            })}
          </section>

          <section className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-slate-500">Avec description</p>
            <p className="mt-2 text-3xl font-black">{stats.described}</p>
          </section>

          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  🔍
                </span>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher par nom, slug ou description..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-12 py-4 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-sm font-semibold text-slate-300">
                {filteredCategories.length} résultat(s)
              </div>
            </div>
          </section>

          {filteredCategories.length === 0 && (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-3xl">
                🧭
              </div>

              <h2 className="mt-6 text-2xl font-black">
                Aucune catégorie trouvée
              </h2>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
                Essayez un autre filtre, modifiez votre recherche ou ajoutez une
                nouvelle catégorie.
              </p>

              <a
                href="/admin/categories/new"
                className="mt-6 inline-flex justify-center rounded-full bg-white px-5 py-2.5 font-bold text-slate-950"
              >
                Ajouter une catégorie
              </a>
            </section>
          )}

          {filteredCategories.length > 0 && (
            <section className="mt-10 grid gap-6 xl:grid-cols-2">
              {filteredCategories.map((category, index) => {
                const isDeleting = deletingId === category.id;
                const isUpdating = updatingId === category.id;

                return (
                  <article
                    key={category.id}
                    className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-emerald-950/30"
                  >
                    <div className="flex flex-col gap-6 md:flex-row md:items-start">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-emerald-400 to-teal-300 text-3xl shadow-lg shadow-emerald-500/20">
                        {getCategoryIcon(index)}
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h2 className="text-2xl font-black">
                                {category.name}
                              </h2>

                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                                  category.is_active
                                )}`}
                              >
                                {getStatusLabel(category.is_active)}
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-semibold text-slate-500">
                              /{category.slug}
                            </p>
                          </div>

                          <a
                            href={`/admin/categories/${category.id}/edit`}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.08]"
                          >
                            Modifier
                          </a>
                        </div>

                        <p className="mt-5 line-clamp-3 leading-7 text-slate-400">
                          {category.description || "Aucune description renseignée."}
                        </p>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                            <p className="text-xs text-slate-500">Slug</p>
                            <p className="mt-1 break-all font-bold text-slate-200">
                              {category.slug || "Non renseigné"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                            <p className="text-xs text-slate-500">Création</p>
                            <p className="mt-1 font-bold text-slate-200">
                              {formatDate(category.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row">
                          <button
                            onClick={() =>
                              updateCategoryStatus(
                                category.id,
                                category.name,
                                !category.is_active
                              )
                            }
                            disabled={isUpdating}
                            className={`flex-1 rounded-full px-5 py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              category.is_active
                                ? "border border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
                                : "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                            }`}
                          >
                            {isUpdating
                              ? "Mise à jour..."
                              : category.is_active
                              ? "Désactiver"
                              : "Activer"}
                          </button>

                          <button
                            onClick={() =>
                              deleteCategory(category.id, category.name)
                            }
                            disabled={isDeleting}
                            className="flex-1 rounded-full border border-red-400/40 bg-red-400/10 px-5 py-3 font-bold text-red-300 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeleting ? "Suppression..." : "Supprimer"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}