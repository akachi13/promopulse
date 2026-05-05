"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

type Deal = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  old_price: number | null;
  new_price: number | null;
  discount_percentage: number | null;
  valid_until: string | null;
  city: string | null;
  status: string | null;
  source_type: string | null;
  ai_confidence_score: number | null;
  stores: {
    name: string;
  } | null;
  categories: {
    name: string;
  } | null;
};

type StatusFilter =
  | "all"
  | "draft"
  | "published"
  | "expired"
  | "archived"
  | "rejected";

function formatPrice(price: number | null) {
  if (!price) return "Prix non renseigné";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(date: string | null) {
  if (!date) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function getStatusLabel(status: string | null) {
  if (status === "draft") return "Brouillon";
  if (status === "published") return "Publiée";
  if (status === "expired") return "Expirée";
  if (status === "archived") return "Archivée";
  if (status === "rejected") return "Rejetée";
  return status || "Brouillon";
}

function getStatusIcon(status: string | null) {
  if (status === "draft") return "📝";
  if (status === "published") return "✅";
  if (status === "expired") return "⏳";
  if (status === "archived") return "📦";
  if (status === "rejected") return "⛔";
  return "📝";
}

function getStatusClass(status: string | null) {
  if (status === "published") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "draft") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }

  if (status === "expired") {
    return "border-red-400/25 bg-red-400/10 text-red-300";
  }

  if (status === "archived") {
    return "border-slate-400/25 bg-slate-400/10 text-slate-300";
  }

  if (status === "rejected") {
    return "border-red-400/25 bg-red-400/10 text-red-300";
  }

  return "border-white/10 bg-white/[0.04] text-slate-300";
}

function getDaysUntil(date: string | null) {
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diff = targetDate.getTime() - today.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  async function loadDeals() {
    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("deals")
      .select(
        `
        id,
        title,
        description,
        image_url,
        old_price,
        new_price,
        discount_percentage,
        valid_until,
        city,
        status,
        source_type,
        ai_confidence_score,
        stores(name),
        categories(name)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Erreur lors du chargement des promotions : ${error.message}`);
      setIsLoading(false);
      return;
    }

    setDeals((data || []) as unknown as Deal[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadDeals();
  }, []);

  const stats = useMemo(() => {
    return {
      all: deals.length,
      draft: deals.filter((deal) => deal.status === "draft").length,
      published: deals.filter((deal) => deal.status === "published").length,
      expired: deals.filter((deal) => deal.status === "expired").length,
      archived: deals.filter((deal) => deal.status === "archived").length,
      rejected: deals.filter((deal) => deal.status === "rejected").length,
    };
  }, [deals]);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchesStatus =
        statusFilter === "all" || deal.status === statusFilter;

      const normalizedSearch = search.toLowerCase().trim();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        deal.title.toLowerCase().includes(normalizedSearch) ||
        (deal.description || "").toLowerCase().includes(normalizedSearch) ||
        (deal.stores?.name || "").toLowerCase().includes(normalizedSearch) ||
        (deal.categories?.name || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (deal.city || "").toLowerCase().includes(normalizedSearch) ||
        (deal.status || "").toLowerCase().includes(normalizedSearch) ||
        (deal.source_type || "").toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [deals, statusFilter, search]);

  const bestDeal = useMemo(() => {
    if (deals.length === 0) return null;

    const publishedWithDiscount = deals
      .filter((deal) => deal.status === "published")
      .sort(
        (a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0)
      );

    return publishedWithDiscount[0] || deals[0];
  }, [deals]);

  const filters = [
    {
      key: "all",
      label: "Toutes",
      count: stats.all,
      icon: "🔥",
    },
    {
      key: "draft",
      label: "Brouillons",
      count: stats.draft,
      icon: "📝",
    },
    {
      key: "published",
      label: "Publiées",
      count: stats.published,
      icon: "✅",
    },
    {
      key: "expired",
      label: "Expirées",
      count: stats.expired,
      icon: "⏳",
    },
    {
      key: "archived",
      label: "Archivées",
      count: stats.archived,
      icon: "📦",
    },
    {
      key: "rejected",
      label: "Rejetées",
      count: stats.rejected,
      icon: "⛔",
    },
  ] as const;

  async function updateDealStatus(dealId: string, newStatus: string) {
    setMessage("");
    setUpdatingStatusId(dealId);

    const { error } = await supabase
      .from("deals")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId);

    setUpdatingStatusId(null);

    if (error) {
      setMessage(`Erreur lors du changement de statut : ${error.message}`);
      return;
    }

    setDeals((current) =>
      current.map((deal) =>
        deal.id === dealId ? { ...deal, status: newStatus } : deal
      )
    );

    setMessage(`Promotion passée au statut : ${getStatusLabel(newStatus)}.`);
  }

  async function deleteDeal(dealId: string, dealTitle: string) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la promotion "${dealTitle}" ?`
    );

    if (!confirmed) return;

    setMessage("");
    setDeletingId(dealId);

    const { error } = await supabase.from("deals").delete().eq("id", dealId);

    setDeletingId(null);

    if (error) {
      setMessage(`Erreur lors de la suppression : ${error.message}`);
      return;
    }

    setDeals((current) => current.filter((deal) => deal.id !== dealId));
    setMessage("Promotion supprimée avec succès.");
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
                onClick={loadDeals}
                disabled={isLoading}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Actualisation..." : "Actualiser"}
              </button>

              <a
                href="/admin/import-promotions"
                className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
              >
                ✨ Import Gemini
              </a>

              <a
                href="/admin/deals/new"
                className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5"
              >
                + Nouvelle promotion
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
                  Gestion des promotions
                </span>

                <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Pilotez vos{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                    offres
                  </span>{" "}
                  commerciales.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Validez les brouillons issus de l’import Gemini, publiez les
                  promotions visibles côté utilisateur, archivez les anciennes
                  offres et gardez un catalogue propre.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Total promotions</p>
                    <p className="mt-2 text-4xl font-black">{stats.all}</p>
                  </div>

                  <div className="rounded-3xl border border-amber-400/25 bg-amber-400/10 p-5">
                    <p className="text-sm text-amber-100">Brouillons</p>
                    <p className="mt-2 text-4xl font-black text-amber-200">
                      {stats.draft}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <p className="text-sm text-emerald-200">Publiées</p>
                    <p className="mt-2 text-4xl font-black text-emerald-300">
                      {stats.published}
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
                    Offre mise en avant
                  </p>

                  {bestDeal ? (
                    <>
                      <h2 className="mt-4 text-3xl font-black">
                        {bestDeal.title}
                      </h2>

                      <p className="mt-4 line-clamp-4 leading-7 text-emerald-100">
                        {bestDeal.description ||
                          "Promotion disponible dans le back-office."}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-4 py-2 text-sm font-bold ${getStatusClass(
                            bestDeal.status
                          )}`}
                        >
                          {getStatusIcon(bestDeal.status)}{" "}
                          {getStatusLabel(bestDeal.status)}
                        </span>

                        {bestDeal.discount_percentage && (
                          <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                            -{bestDeal.discount_percentage}%
                          </span>
                        )}
                      </div>

                      <div className="mt-7 rounded-3xl bg-slate-950/50 p-5">
                        <p className="text-sm text-emerald-100">Nouveau prix</p>
                        <p className="mt-1 text-3xl font-black text-white">
                          {formatPrice(bestDeal.new_price)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-4 text-3xl font-black">
                        Aucune promotion
                      </h2>

                      <p className="mt-4 leading-7 text-emerald-100">
                        Ajoutez une promotion ou lancez un import Gemini pour
                        commencer.
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                  <p className="text-sm font-bold text-white">
                    Workflow recommandé
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    Importer → Corriger → Brouillon → Publier → Notifier.
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
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

          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  🔍
                </span>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher par titre, magasin, catégorie, ville, statut ou source..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-12 py-4 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-sm font-semibold text-slate-300">
                {filteredDeals.length} résultat(s)
              </div>
            </div>
          </section>

          {isLoading && (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
              <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-emerald-400/30" />
              <p className="mt-5 text-slate-300">
                Chargement des promotions...
              </p>
            </section>
          )}

          {!isLoading && filteredDeals.length === 0 && (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-3xl">
                🧭
              </div>

              <h2 className="mt-6 text-2xl font-black">
                Aucune promotion trouvée
              </h2>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
                Essayez un autre statut, modifiez votre recherche ou lancez un
                import Gemini pour créer de nouvelles promotions.
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href="/admin/import-promotions"
                  className="inline-flex justify-center rounded-full bg-white px-5 py-2.5 font-bold text-slate-950"
                >
                  Lancer un import
                </a>

                <a
                  href="/admin/deals/new"
                  className="inline-flex justify-center rounded-full border border-white/10 px-5 py-2.5 font-bold text-white hover:bg-white/[0.06]"
                >
                  Ajouter manuellement
                </a>
              </div>
            </section>
          )}

          {!isLoading && filteredDeals.length > 0 && (
            <section className="mt-10 grid gap-6 xl:grid-cols-2">
              {filteredDeals.map((deal) => {
                const isDeleting = deletingId === deal.id;
                const isUpdating = updatingStatusId === deal.id;
                const days = getDaysUntil(deal.valid_until);
                const isUrgent = days !== null && days <= 3 && days >= 0;

                return (
                  <article
                    key={deal.id}
                    className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-emerald-950/30"
                  >
                    <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                      <div className="relative min-h-72 overflow-hidden bg-slate-950">
                        {deal.image_url ? (
                          <img
                            src={deal.image_url}
                            alt={deal.title}
                            className="h-full min-h-72 w-full object-cover transition duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full min-h-72 items-center justify-center bg-gradient-to-br from-emerald-400/20 via-slate-900 to-slate-950">
                            <span className="text-sm font-black text-emerald-300">
                              PromoPulse
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />

                        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-4 py-2 text-xs font-black backdrop-blur-xl ${getStatusClass(
                              deal.status
                            )}`}
                          >
                            {getStatusIcon(deal.status)}{" "}
                            {getStatusLabel(deal.status)}
                          </span>

                          {deal.discount_percentage && (
                            <span className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/30">
                              -{deal.discount_percentage}%
                            </span>
                          )}

                          {isUrgent && (
                            <span className="rounded-full bg-red-400 px-4 py-2 text-xs font-black text-slate-950">
                              Bientôt fini
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-5 left-5 right-5">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-xl">
                              {deal.stores?.name || "Magasin non renseigné"}
                            </span>

                            <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-xl">
                              {deal.categories?.name ||
                                "Catégorie non renseignée"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
                              {deal.source_type || "manual"}
                              {deal.ai_confidence_score !== null &&
                                ` · IA ${deal.ai_confidence_score}%`}
                            </p>

                            <h2 className="mt-3 line-clamp-2 text-2xl font-black">
                              {deal.title}
                            </h2>
                          </div>

                          <a
                            href={`/admin/deals/${deal.id}/edit`}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.08]"
                          >
                            Modifier
                          </a>
                        </div>

                        <p className="mt-4 line-clamp-3 leading-7 text-slate-400">
                          {deal.description || "Aucune description disponible."}
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                            <p className="text-xs text-slate-500">
                              Ancien prix
                            </p>
                            <p className="mt-1 text-sm text-slate-500 line-through">
                              {formatPrice(deal.old_price)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-right">
                            <p className="text-xs text-emerald-100">
                              Nouveau prix
                            </p>
                            <p className="mt-1 text-xl font-black text-emerald-300">
                              {formatPrice(deal.new_price)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                            <p className="text-xs text-slate-500">Ville</p>
                            <p className="mt-1 font-semibold text-slate-300">
                              {deal.city || "Non renseignée"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                            <p className="text-xs text-slate-500">Validité</p>
                            <p className="mt-1 font-semibold text-slate-300">
                              {formatDate(deal.valid_until)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-5">
                          {deal.status !== "published" && (
                            <button
                              onClick={() =>
                                updateDealStatus(deal.id, "published")
                              }
                              disabled={isUpdating}
                              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                            >
                              Publier
                            </button>
                          )}

                          {deal.status !== "draft" && (
                            <button
                              onClick={() => updateDealStatus(deal.id, "draft")}
                              disabled={isUpdating}
                              className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-60"
                            >
                              Brouillon
                            </button>
                          )}

                          {deal.status !== "archived" && (
                            <button
                              onClick={() =>
                                updateDealStatus(deal.id, "archived")
                              }
                              disabled={isUpdating}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-60"
                            >
                              Archiver
                            </button>
                          )}

                          {deal.status !== "rejected" && (
                            <button
                              onClick={() =>
                                updateDealStatus(deal.id, "rejected")
                              }
                              disabled={isUpdating}
                              className="rounded-full border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400/20 disabled:opacity-60"
                            >
                              Rejeter
                            </button>
                          )}

                          <button
                            onClick={() => deleteDeal(deal.id, deal.title)}
                            disabled={isDeleting}
                            className="rounded-full border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400/20 disabled:opacity-60"
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