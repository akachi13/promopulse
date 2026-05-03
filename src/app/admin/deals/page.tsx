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

function formatPrice(price: number | null) {
  if (!price) return "-";

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
  return status || "draft";
}

function getStatusClass(status: string | null) {
  if (status === "published") {
    return "bg-emerald-400/20 text-emerald-300";
  }

  if (status === "draft") {
    return "bg-amber-400/20 text-amber-200";
  }

  if (status === "expired") {
    return "bg-red-400/20 text-red-300";
  }

  if (status === "archived") {
    return "bg-slate-400/20 text-slate-300";
  }

  if (status === "rejected") {
    return "bg-red-400/20 text-red-300";
  }

  return "bg-white/10 text-slate-300";
}

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
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
          .includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [deals, statusFilter, search]);

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

    setMessage(`Statut mis à jour : ${getStatusLabel(newStatus)}.`);
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <a href="/admin" className="text-sm text-emerald-300">
            ← Retour à l’administration
          </a>

          <div className="mt-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold">Gestion des promotions</h1>
              <p className="mt-2 text-slate-300">
                Consultez, filtrez, publiez, modifiez ou supprimez les offres
                promotionnelles.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/admin/import-promotions"
                className="inline-flex justify-center rounded-full border border-emerald-400/40 px-6 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-400/10"
              >
                Importer des promos
              </a>

              <a
                href="/admin/deals/new"
                className="inline-flex justify-center rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Ajouter une promotion
              </a>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-6">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "all"
                  ? "border-emerald-400 bg-emerald-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Toutes</p>
              <p className="mt-1 text-2xl font-bold">{stats.all}</p>
            </button>

            <button
              onClick={() => setStatusFilter("draft")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "draft"
                  ? "border-amber-400 bg-amber-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Brouillons</p>
              <p className="mt-1 text-2xl font-bold">{stats.draft}</p>
            </button>

            <button
              onClick={() => setStatusFilter("published")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "published"
                  ? "border-emerald-400 bg-emerald-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Publiées</p>
              <p className="mt-1 text-2xl font-bold">{stats.published}</p>
            </button>

            <button
              onClick={() => setStatusFilter("expired")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "expired"
                  ? "border-red-400 bg-red-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Expirées</p>
              <p className="mt-1 text-2xl font-bold">{stats.expired}</p>
            </button>

            <button
              onClick={() => setStatusFilter("archived")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "archived"
                  ? "border-slate-400 bg-slate-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Archivées</p>
              <p className="mt-1 text-2xl font-bold">{stats.archived}</p>
            </button>

            <button
              onClick={() => setStatusFilter("rejected")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "rejected"
                  ? "border-red-400 bg-red-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Rejetées</p>
              <p className="mt-1 text-2xl font-bold">{stats.rejected}</p>
            </button>
          </div>

          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher par titre, magasin ou catégorie..."
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
              />

              <button
                onClick={loadDeals}
                className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Actualiser
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Chargement des promotions...
            </div>
          )}

          {message && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
              {message}
            </div>
          )}

          {!isLoading && filteredDeals.length === 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Aucune promotion ne correspond au filtre sélectionné.
            </div>
          )}

          {!isLoading && filteredDeals.length > 0 && (
            <div className="mt-10 space-y-5">
              {filteredDeals.map((deal) => {
                const isDeleting = deletingId === deal.id;
                const isUpdatingStatus = updatingStatusId === deal.id;

                return (
                  <div
                    key={deal.id}
                    className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
                  >
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          {deal.discount_percentage && (
                            <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                              -{deal.discount_percentage}%
                            </span>
                          )}

                          <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusClass(
                              deal.status
                            )}`}
                          >
                            {getStatusLabel(deal.status)}
                          </span>

                          {deal.source_type && (
                            <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                              Source : {deal.source_type}
                            </span>
                          )}

                          {deal.ai_confidence_score && (
                            <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                              IA : {deal.ai_confidence_score}%
                            </span>
                          )}
                        </div>

                        {deal.image_url ? (
                          <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
                            <img
                              src={deal.image_url}
                              alt={deal.title}
                              className="h-56 w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="mt-5 flex h-40 items-center justify-center rounded-3xl border border-white/10 bg-emerald-400/10">
                            <span className="text-sm font-semibold text-emerald-300">
                              PromoPulse
                            </span>
                          </div>
                        )}

                        <h2 className="mt-5 text-2xl font-bold">
                          {deal.title}
                        </h2>

                        <p className="mt-2 text-slate-300">
                          {deal.description || "Aucune description."}
                        </p>

                        <div className="mt-5 grid gap-3 text-sm text-slate-300 md:grid-cols-2 lg:grid-cols-4">
                          <p>
                            Magasin :{" "}
                            <span className="text-white">
                              {deal.stores?.name || "Non renseigné"}
                            </span>
                          </p>

                          <p>
                            Catégorie :{" "}
                            <span className="text-white">
                              {deal.categories?.name || "Non classée"}
                            </span>
                          </p>

                          <p>
                            Ville :{" "}
                            <span className="text-white">
                              {deal.city || "Non renseignée"}
                            </span>
                          </p>

                          <p>
                            Validité :{" "}
                            <span className="text-white">
                              {formatDate(deal.valid_until)}
                            </span>
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                          <p className="text-slate-400 line-through">
                            Ancien prix : {formatPrice(deal.old_price)}
                          </p>

                          <p className="font-semibold text-emerald-300">
                            Nouveau prix : {formatPrice(deal.new_price)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                        <a
                          href={`/admin/deals/${deal.id}/edit`}
                          className="inline-flex justify-center rounded-full bg-white px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-slate-200"
                        >
                          Modifier
                        </a>

                        {deal.status === "draft" && (
                          <button
                            onClick={() =>
                              updateDealStatus(deal.id, "published")
                            }
                            disabled={isUpdatingStatus}
                            className="inline-flex justify-center rounded-full bg-emerald-400 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                          >
                            {isUpdatingStatus ? "Mise à jour..." : "Publier"}
                          </button>
                        )}

                        {deal.status === "published" && (
                          <button
                            onClick={() =>
                              updateDealStatus(deal.id, "archived")
                            }
                            disabled={isUpdatingStatus}
                            className="inline-flex justify-center rounded-full border border-slate-400/40 px-5 py-2.5 font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-60"
                          >
                            {isUpdatingStatus ? "Mise à jour..." : "Archiver"}
                          </button>
                        )}

                        {deal.status !== "rejected" && (
                          <button
                            onClick={() =>
                              updateDealStatus(deal.id, "rejected")
                            }
                            disabled={isUpdatingStatus}
                            className="inline-flex justify-center rounded-full border border-red-400/40 px-5 py-2.5 font-semibold text-red-300 transition hover:bg-red-400/10 disabled:opacity-60"
                          >
                            {isUpdatingStatus ? "Mise à jour..." : "Rejeter"}
                          </button>
                        )}

                        {(deal.status === "archived" ||
                          deal.status === "rejected") && (
                          <button
                            onClick={() => updateDealStatus(deal.id, "draft")}
                            disabled={isUpdatingStatus}
                            className="inline-flex justify-center rounded-full border border-amber-400/40 px-5 py-2.5 font-semibold text-amber-200 transition hover:bg-amber-400/10 disabled:opacity-60"
                          >
                            {isUpdatingStatus
                              ? "Mise à jour..."
                              : "Remettre en brouillon"}
                          </button>
                        )}

                        <button
                          onClick={() => deleteDeal(deal.id, deal.title)}
                          disabled={isDeleting}
                          className="inline-flex justify-center rounded-full border border-red-400/40 px-5 py-2.5 font-semibold text-red-300 transition hover:bg-red-400/10 disabled:opacity-60"
                        >
                          {isDeleting ? "Suppression..." : "Supprimer"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}