"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

type Store = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  country: string | null;
  city: string | null;
  website_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
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
  return isActive ? "Actif" : "Inactif";
}

function getStoreInitial(name: string) {
  return name.slice(0, 1).toUpperCase();
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  async function loadStores() {
    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("stores")
      .select(
        "id, name, slug, description, country, city, website_url, facebook_url, tiktok_url, is_active, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Erreur lors du chargement des magasins : ${error.message}`);
      setIsLoading(false);
      return;
    }

    setStores((data || []) as Store[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadStores();
  }, []);

  async function updateStoreStatus(
    storeId: string,
    storeName: string,
    isActive: boolean
  ) {
    setMessage("");
    setUpdatingId(storeId);

    const { error } = await supabase
      .from("stores")
      .update({
        is_active: isActive,
      })
      .eq("id", storeId);

    setUpdatingId(null);

    if (error) {
      setMessage(`Erreur lors du changement de statut : ${error.message}`);
      return;
    }

    setStores((current) =>
      current.map((store) =>
        store.id === storeId ? { ...store, is_active: isActive } : store
      )
    );

    setMessage(
      `Le magasin "${storeName}" est maintenant ${
        isActive ? "actif" : "inactif"
      }.`
    );
  }

  async function deleteStore(storeId: string, storeName: string) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le magasin "${storeName}" ?`
    );

    if (!confirmed) return;

    setMessage("");
    setDeletingId(storeId);

    const { error } = await supabase.from("stores").delete().eq("id", storeId);

    setDeletingId(null);

    if (error) {
      setMessage(`Erreur lors de la suppression : ${error.message}`);
      return;
    }

    setStores((current) => current.filter((store) => store.id !== storeId));
    setMessage("Magasin supprimé avec succès.");
  }

  const stats = useMemo(() => {
    return {
      all: stores.length,
      active: stores.filter((store) => store.is_active).length,
      inactive: stores.filter((store) => !store.is_active).length,
      withWebsite: stores.filter((store) => store.website_url).length,
      withFacebook: stores.filter((store) => store.facebook_url).length,
      withTikTok: stores.filter((store) => store.tiktok_url).length,
    };
  }, [stores]);

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const normalizedSearch = search.toLowerCase().trim();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        store.name.toLowerCase().includes(normalizedSearch) ||
        store.slug.toLowerCase().includes(normalizedSearch) ||
        (store.description || "").toLowerCase().includes(normalizedSearch) ||
        (store.country || "").toLowerCase().includes(normalizedSearch) ||
        (store.city || "").toLowerCase().includes(normalizedSearch) ||
        (store.website_url || "").toLowerCase().includes(normalizedSearch) ||
        (store.facebook_url || "").toLowerCase().includes(normalizedSearch) ||
        (store.tiktok_url || "").toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && store.is_active) ||
        (statusFilter === "inactive" && !store.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [stores, search, statusFilter]);

  const latestStore = stores[0] || null;

  const filters = [
    {
      key: "all",
      label: "Tous",
      count: stats.all,
      icon: "🏬",
    },
    {
      key: "active",
      label: "Actifs",
      count: stats.active,
      icon: "✅",
    },
    {
      key: "inactive",
      label: "Inactifs",
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
              Chargement des magasins...
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
                onClick={loadStores}
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
                href="/admin/stores/new"
                className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5"
              >
                + Ajouter un magasin
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
                  Gestion des magasins
                </span>

                <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Pilotez vos{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                    enseignes
                  </span>{" "}
                  partenaires.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Gérez les magasins disponibles sur PromoPulse, leurs sources
                  web, Facebook et TikTok, leurs villes, pays et statuts de
                  visibilité.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Total magasins</p>
                    <p className="mt-2 text-4xl font-black">{stats.all}</p>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <p className="text-sm text-emerald-200">Actifs</p>
                    <p className="mt-2 text-4xl font-black text-emerald-300">
                      {stats.active}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5">
                    <p className="text-sm text-red-200">Inactifs</p>
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
                    Dernier magasin
                  </p>

                  {latestStore ? (
                    <>
                      <h2 className="mt-4 text-3xl font-black">
                        {latestStore.name}
                      </h2>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-4 py-2 text-sm font-bold ${getStatusClass(
                            latestStore.is_active
                          )}`}
                        >
                          {getStatusLabel(latestStore.is_active)}
                        </span>

                        <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                          {latestStore.city || "Ville non renseignée"}
                        </span>
                      </div>

                      <p className="mt-5 text-sm leading-6 text-emerald-100">
                        Pays :{" "}
                        <span className="font-bold text-white">
                          {latestStore.country || "Non renseigné"}
                        </span>
                      </p>

                      <p className="mt-2 text-sm leading-6 text-emerald-100">
                        Création :{" "}
                        <span className="font-bold text-white">
                          {formatDate(latestStore.created_at)}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-4 text-3xl font-black">
                        Aucun magasin
                      </h2>

                      <p className="mt-4 leading-7 text-emerald-100">
                        Ajoutez votre premier magasin pour commencer à publier
                        des promotions ciblées.
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                  <p className="text-sm font-bold text-white">
                    Sources import IA
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    Les liens web, Facebook et TikTok permettent à Gemini de
                    détecter automatiquement les promotions.
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

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-slate-500">Avec site web</p>
              <p className="mt-2 text-3xl font-black">{stats.withWebsite}</p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-slate-500">Avec Facebook</p>
              <p className="mt-2 text-3xl font-black">{stats.withFacebook}</p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-slate-500">Avec TikTok</p>
              <p className="mt-2 text-3xl font-black">{stats.withTikTok}</p>
            </div>
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
                  placeholder="Rechercher par nom, slug, ville, pays, site web, Facebook ou TikTok..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-12 py-4 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-sm font-semibold text-slate-300">
                {filteredStores.length} résultat(s)
              </div>
            </div>
          </section>

          {filteredStores.length === 0 && (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-3xl">
                🧭
              </div>

              <h2 className="mt-6 text-2xl font-black">
                Aucun magasin trouvé
              </h2>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
                Essayez un autre filtre, modifiez votre recherche ou ajoutez un
                nouveau magasin.
              </p>

              <a
                href="/admin/stores/new"
                className="mt-6 inline-flex justify-center rounded-full bg-white px-5 py-2.5 font-bold text-slate-950"
              >
                Ajouter un magasin
              </a>
            </section>
          )}

          {filteredStores.length > 0 && (
            <section className="mt-10 grid gap-6 xl:grid-cols-2">
              {filteredStores.map((store) => {
                const isDeleting = deletingId === store.id;
                const isUpdating = updatingId === store.id;

                return (
                  <article
                    key={store.id}
                    className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-emerald-950/30"
                  >
                    <div className="flex flex-col gap-6 md:flex-row md:items-start">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-emerald-400 to-teal-300 text-3xl font-black text-slate-950 shadow-lg shadow-emerald-500/20">
                        {getStoreInitial(store.name)}
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h2 className="text-2xl font-black">
                                {store.name}
                              </h2>

                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                                  store.is_active
                                )}`}
                              >
                                {getStatusLabel(store.is_active)}
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-semibold text-slate-500">
                              {store.slug}
                            </p>
                          </div>

                          <a
                            href={`/admin/stores/${store.id}/edit`}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.08]"
                          >
                            Modifier
                          </a>
                        </div>

                        <p className="mt-5 line-clamp-3 leading-7 text-slate-400">
                          {store.description || "Aucune description renseignée."}
                        </p>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                            <p className="text-xs text-slate-500">Ville</p>
                            <p className="mt-1 font-bold text-slate-200">
                              {store.city || "Non renseignée"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                            <p className="text-xs text-slate-500">Pays</p>
                            <p className="mt-1 font-bold text-slate-200">
                              {store.country || "Non renseigné"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                            <p className="text-xs text-slate-500">Site web</p>
                            <p className="mt-1 break-all text-sm font-semibold text-slate-300">
                              {store.website_url || "Non renseigné"}
                            </p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                              <p className="text-xs text-slate-500">Facebook</p>
                              <p className="mt-1 break-all text-sm font-semibold text-slate-300">
                                {store.facebook_url || "Non renseigné"}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                              <p className="text-xs text-slate-500">TikTok</p>
                              <p className="mt-1 break-all text-sm font-semibold text-slate-300">
                                {store.tiktok_url || "Non renseigné"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row">
                          <button
                            onClick={() =>
                              updateStoreStatus(
                                store.id,
                                store.name,
                                !store.is_active
                              )
                            }
                            disabled={isUpdating}
                            className={`flex-1 rounded-full px-5 py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              store.is_active
                                ? "border border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
                                : "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                            }`}
                          >
                            {isUpdating
                              ? "Mise à jour..."
                              : store.is_active
                              ? "Désactiver"
                              : "Activer"}
                          </button>

                          <button
                            onClick={() => deleteStore(store.id, store.name)}
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