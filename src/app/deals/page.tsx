"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Deal = {
  id: string;
  title: string;
  description: string | null;
  old_price: number | null;
  new_price: number | null;
  discount_percentage: number | null;
  valid_until: string | null;
  city: string | null;
  stores: {
    name: string;
  } | null;
  categories: {
    name: string;
  } | null;
};

function formatPrice(price: number | null) {
  if (!price) return null;

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

export default function DealsPage() {
  const router = useRouter();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [hasPreferences, setHasPreferences] = useState(false);

  useEffect(() => {
    async function loadDeals() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data: userStores } = await supabase
        .from("user_stores")
        .select("store_id")
        .eq("user_id", user.id);

      const { data: userCategories } = await supabase
        .from("user_categories")
        .select("category_id")
        .eq("user_id", user.id);

      const followedStoreIds =
        userStores?.map((item) => item.store_id as string) || [];

      const followedCategoryIds =
        userCategories?.map((item) => item.category_id as string) || [];

      const userHasPreferences =
        followedStoreIds.length > 0 || followedCategoryIds.length > 0;

      setHasPreferences(userHasPreferences);

      let query = supabase
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
          store_id,
          category_id,
          stores(name),
          categories(name)
        `
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (followedStoreIds.length > 0 && followedCategoryIds.length > 0) {
        query = query.or(
          `store_id.in.(${followedStoreIds.join(
            ","
          )}),category_id.in.(${followedCategoryIds.join(",")})`
        );
      } else if (followedStoreIds.length > 0) {
        query = query.in("store_id", followedStoreIds);
      } else if (followedCategoryIds.length > 0) {
        query = query.in("category_id", followedCategoryIds);
      }

      const { data, error } = await query;

      if (error) {
        setMessage(`Erreur lors du chargement des promotions : ${error.message}`);
        setIsLoading(false);
        return;
      }

      setDeals((data || []) as unknown as Deal[]);
      setIsLoading(false);
    }

    loadDeals();
  }, [router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-slate-300">Chargement des promotions...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-emerald-300">
          ← Retour au dashboard
        </a>

        <div className="mt-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-bold">Promotions personnalisées</h1>
            <p className="mt-2 text-slate-300">
              Consultez les offres correspondant à vos magasins et catégories
              d’intérêt.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="/stores"
              className="rounded-full bg-white px-5 py-3 text-center font-semibold text-slate-950 hover:bg-slate-200"
            >
              Mes magasins
            </a>

            <a
              href="/categories"
              className="rounded-full bg-emerald-400 px-5 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-300"
            >
              Mes catégories
            </a>
          </div>
        </div>

        {!hasPreferences && (
          <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100">
            Vous n’avez pas encore sélectionné de magasins ou de catégories.
            Les promotions affichées correspondent donc à toutes les offres
            publiées. Sélectionnez vos préférences pour obtenir un flux plus
            personnalisé.
          </div>
        )}

        {message && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
            {message}
          </div>
        )}

        {!message && deals.length === 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
            Aucune promotion ne correspond actuellement à vos préférences.
            Essayez d’ajouter d’autres magasins ou catégories.
          </div>
        )}

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
            >
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                -{deal.discount_percentage || 0}%
              </span>

              <h2 className="mt-5 text-xl font-semibold">{deal.title}</h2>

              <p className="mt-2 text-slate-300">
                {deal.stores?.name || "Magasin non renseigné"}
              </p>

              <p className="mt-4 leading-7 text-slate-300">
                {deal.description || "Aucune description disponible."}
              </p>

              <div className="mt-5 space-y-2 text-sm text-slate-300">
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
                  Prix :{" "}
                  {deal.old_price && (
                    <span className="text-slate-500 line-through">
                      {formatPrice(deal.old_price)}
                    </span>
                  )}{" "}
                  {deal.new_price && (
                    <span className="font-semibold text-emerald-300">
                      {formatPrice(deal.new_price)}
                    </span>
                  )}
                </p>

                <p>
                  Valable jusqu’au :{" "}
                  <span className="text-white">
                    {formatDate(deal.valid_until)}
                  </span>
                </p>
              </div>

              <button className="mt-6 rounded-full bg-white px-5 py-2.5 font-semibold text-slate-950">
                Voir le détail
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}