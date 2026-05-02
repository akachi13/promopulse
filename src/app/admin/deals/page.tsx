"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

type Deal = {
  id: string;
  title: string;
  description: string | null;
  old_price: number | null;
  new_price: number | null;
  discount_percentage: number | null;
  valid_until: string | null;
  city: string | null;
  status: string | null;
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

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDeals() {
      const { data, error } = await supabase
        .from("deals")
        .select(
          `
          id,
          title,
          description,
          old_price,
          new_price,
          discount_percentage,
          valid_until,
          city,
          status,
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

    loadDeals();
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
              <h1 className="text-4xl font-bold">Gestion des promotions</h1>
              <p className="mt-2 text-slate-300">
                Consultez les offres publiées ou créées manuellement dans PromoPulse.
              </p>
            </div>

            <a
              href="/admin/deals/new"
              className="inline-flex rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Ajouter une promotion
            </a>
          </div>

          {isLoading && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Chargement des promotions...
            </div>
          )}

          {message && (
            <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
              {message}
            </div>
          )}

          {!isLoading && !message && deals.length === 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Aucune promotion enregistrée pour le moment.
            </div>
          )}

          {!isLoading && deals.length > 0 && (
            <div className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
              <div className="hidden grid-cols-7 gap-4 border-b border-white/10 px-6 py-4 text-sm font-semibold text-slate-300 md:grid">
                <span>Titre</span>
                <span>Magasin</span>
                <span>Catégorie</span>
                <span>Ancien prix</span>
                <span>Nouveau prix</span>
                <span>Validité</span>
                <span>Statut</span>
              </div>

              <div className="divide-y divide-white/10">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="grid gap-4 px-6 py-5 text-sm md:grid-cols-7 md:items-center"
                  >
                    <div>
                      <p className="font-semibold text-white">{deal.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                        {deal.description || "Aucune description"}
                      </p>
                    </div>

                    <p className="text-slate-300">
                      {deal.stores?.name || "Non renseigné"}
                    </p>

                    <p className="text-slate-300">
                      {deal.categories?.name || "Non classée"}
                    </p>

                    <p className="text-slate-400 line-through">
                      {formatPrice(deal.old_price)}
                    </p>

                    <p className="font-semibold text-emerald-300">
                      {formatPrice(deal.new_price)}
                    </p>

                    <p className="text-slate-300">
                      {formatDate(deal.valid_until)}
                    </p>

                    <span className="w-fit rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                      {deal.status || "draft"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}