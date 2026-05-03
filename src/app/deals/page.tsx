"use client";

import { useEffect, useMemo, useState } from "react";
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
  store_id: string | null;
  category_id: string | null;
  stores: {
    name: string;
  } | null;
  categories: {
    name: string;
  } | null;
};

function formatPrice(price: number | null) {
  if (!price) return "Prix non renseigné";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(date: string | null) {
  if (!date) return "Validité non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function isDealStillValid(date: string | null) {
  if (!date) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const validUntil = new Date(date);
  validUntil.setHours(0, 0, 0, 0);

  return validUntil >= today;
}

export default function DealsPage() {
  const router = useRouter();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [followedStoreIds, setFollowedStoreIds] = useState<string[]>([]);
  const [followedCategoryIds, setFollowedCategoryIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"personalized" | "stores" | "categories" | "all">(
    "personalized"
  );
  const [search, setSearch] = useState("");

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

      const { data: userStoresData } = await supabase
        .from("user_stores")
        .select("store_id")
        .eq("user_id", user.id);

      const { data: userCategoriesData } = await supabase
        .from("user_categories")
        .select("category_id")
        .eq("user_id", user.id);

      const storeIds = (userStoresData || []).map(
        (item) => item.store_id as string
      );

      const categoryIds = (userCategoriesData || []).map(
        (item) => item.category_id as string
      );

      setFollowedStoreIds(storeIds);
      setFollowedCategoryIds(categoryIds);

      const { data: dealsData, error: dealsError } = await supabase
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

      if (dealsError) {
        setMessage(`Erreur lors du chargement des promotions : ${dealsError.message}`);
        setIsLoading(false);
        return;
      }

      const validDeals = ((dealsData || []) as unknown as Deal[]).filter(
        (deal) => isDealStillValid(deal.valid_until)
      );

      setDeals(validDeals);
      setIsLoading(false);
    }

    loadDeals();
  }, [router]);

  const filteredDeals = useMemo(() => {
    const hasPreferences =
      followedStoreIds.length > 0 || followedCategoryIds.length > 0;

    return deals.filter((deal) => {
      const matchesSearch =
        search.trim().length === 0 ||
        deal.title.toLowerCase().includes(search.toLowerCase()) ||
        (deal.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (deal.stores?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (deal.categories?.name || "")
          .toLowerCase()
          .includes(search.toLowerCase());

      if (!matchesSearch) return false;

      const matchesStore =
        deal.store_id !== null && followedStoreIds.includes(deal.store_id);

      const matchesCategory =
        deal.category_id !== null &&
        followedCategoryIds.includes(deal.category_id);

      if (filter === "all") return true;

      if (filter === "stores") return matchesStore;

      if (filter === "categories") return matchesCategory;

      if (!hasPreferences) return true;

      return matchesStore || matchesCategory;
    });
  }, [deals, followedStoreIds, followedCategoryIds, filter, search]);

  const personalizedCount = useMemo(() => {
    const hasPreferences =
      followedStoreIds.length > 0 || followedCategoryIds.length > 0;

    if (!hasPreferences) return deals.length;

    return deals.filter((deal) => {
      const matchesStore =
        deal.store_id !== null && followedStoreIds.includes(deal.store_id);

      const matchesCategory =
        deal.category_id !== null &&
        followedCategoryIds.includes(deal.category_id);

      return matchesStore || matchesCategory;
    }).length;
  }, [deals, followedStoreIds, followedCategoryIds]);

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
            <h1 className="text-4xl font-bold">Mes promotions</h1>
            <p className="mt-2 max-w-3xl text-slate-300">
              Consultez les offres publiées correspondant à vos magasins et
              catégories suivis.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-slate-400">Promotions actives</p>
              <p className="mt-1 text-3xl font-bold">{deals.length}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-slate-400">Personnalisées</p>
              <p className="mt-1 text-3xl font-bold">{personalizedCount}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-slate-400">Préférences</p>
              <p className="mt-1 text-xl font-bold">
                {followedStoreIds.length} magasins / {followedCategoryIds.length} catégories
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
            {message}
          </div>
        )}

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une promotion, un magasin ou une catégorie..."
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            />

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFilter("personalized")}
                className={`rounded-full px-5 py-2.5 font-semibold transition ${
                  filter === "personalized"
                    ? "bg-emerald-400 text-slate-950"
                    : "border border-white/20 text-white hover:bg-white/10"
                }`}
              >
                Pour moi
              </button>

              <button
                onClick={() => setFilter("stores")}
                className={`rounded-full px-5 py-2.5 font-semibold transition ${
                  filter === "stores"
                    ? "bg-emerald-400 text-slate-950"
                    : "border border-white/20 text-white hover:bg-white/10"
                }`}
              >
                Mes magasins
              </button>

              <button
                onClick={() => setFilter("categories")}
                className={`rounded-full px-5 py-2.5 font-semibold transition ${
                  filter === "categories"
                    ? "bg-emerald-400 text-slate-950"
                    : "border border-white/20 text-white hover:bg-white/10"
                }`}
              >
                Mes catégories
              </button>

              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-5 py-2.5 font-semibold transition ${
                  filter === "all"
                    ? "bg-emerald-400 text-slate-950"
                    : "border border-white/20 text-white hover:bg-white/10"
                }`}
              >
                Toutes
              </button>
            </div>
          </div>
        </div>

        {deals.length === 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
            Aucune promotion publiée pour le moment.
          </div>
        )}

        {deals.length > 0 && filteredDeals.length === 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
            Aucune promotion ne correspond à vos filtres.
          </div>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredDeals.map((deal) => (
            <div
              key={deal.id}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-400/20" />

                {deal.discount_percentage && (
                  <span className="rounded-full bg-emerald-400 px-3 py-1 text-sm font-bold text-slate-950">
                    -{deal.discount_percentage}%
                  </span>
                )}
              </div>

              <h2 className="mt-5 text-xl font-bold">{deal.title}</h2>

              <p className="mt-3 line-clamp-4 leading-7 text-slate-300">
                {deal.description || "Aucune description disponible."}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                  {deal.stores?.name || "Magasin non renseigné"}
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                  {deal.categories?.name || "Catégorie non renseignée"}
                </span>

                {deal.city && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                    {deal.city}
                  </span>
                )}
              </div>

              <div className="mt-6 rounded-2xl bg-slate-900 p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Ancien prix</p>
                    <p className="mt-1 text-sm text-slate-500 line-through">
                      {formatPrice(deal.old_price)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-400">Nouveau prix</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-300">
                      {formatPrice(deal.new_price)}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-sm text-slate-400">
                Valable jusqu’au :{" "}
                <span className="text-slate-200">
                  {formatDate(deal.valid_until)}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}