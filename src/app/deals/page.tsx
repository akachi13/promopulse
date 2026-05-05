"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

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

function getDaysUntil(date: string | null) {
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diff = targetDate.getTime() - today.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function DealsPage() {
  const router = useRouter();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [followedStoreIds, setFollowedStoreIds] = useState<string[]>([]);
  const [followedCategoryIds, setFollowedCategoryIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<
    "personalized" | "stores" | "categories" | "all"
  >("personalized");
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
          image_url,
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
        setMessage(
          `Erreur lors du chargement des promotions : ${dealsError.message}`
        );
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
      const normalizedSearch = search.toLowerCase().trim();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        deal.title.toLowerCase().includes(normalizedSearch) ||
        (deal.description || "").toLowerCase().includes(normalizedSearch) ||
        (deal.stores?.name || "").toLowerCase().includes(normalizedSearch) ||
        (deal.categories?.name || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (deal.city || "").toLowerCase().includes(normalizedSearch);

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

  const personalizedDeals = useMemo(() => {
    const hasPreferences =
      followedStoreIds.length > 0 || followedCategoryIds.length > 0;

    if (!hasPreferences) return deals;

    return deals.filter((deal) => {
      const matchesStore =
        deal.store_id !== null && followedStoreIds.includes(deal.store_id);

      const matchesCategory =
        deal.category_id !== null &&
        followedCategoryIds.includes(deal.category_id);

      return matchesStore || matchesCategory;
    });
  }, [deals, followedStoreIds, followedCategoryIds]);

  const storeDealsCount = useMemo(() => {
    return deals.filter(
      (deal) => deal.store_id !== null && followedStoreIds.includes(deal.store_id)
    ).length;
  }, [deals, followedStoreIds]);

  const categoryDealsCount = useMemo(() => {
    return deals.filter(
      (deal) =>
        deal.category_id !== null && followedCategoryIds.includes(deal.category_id)
    ).length;
  }, [deals, followedCategoryIds]);

  const bestDeal = useMemo(() => {
    if (filteredDeals.length === 0) return null;

    const withDiscount = filteredDeals
      .filter((deal) => deal.discount_percentage !== null)
      .sort(
        (a, b) =>
          (b.discount_percentage || 0) - (a.discount_percentage || 0)
      );

    return withDiscount[0] || filteredDeals[0];
  }, [filteredDeals]);

  const filters = [
    {
      key: "personalized",
      label: "Pour moi",
      count: personalizedDeals.length,
      icon: "✨",
    },
    {
      key: "stores",
      label: "Mes magasins",
      count: storeDealsCount,
      icon: "🏬",
    },
    {
      key: "categories",
      label: "Mes catégories",
      count: categoryDealsCount,
      icon: "🏷️",
    },
    {
      key: "all",
      label: "Toutes",
      count: deals.length,
      icon: "🔥",
    },
  ] as const;

  if (isLoading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6 text-white">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[130px]" />
          <div className="absolute bottom-[-12rem] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-emerald-700/15 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 text-center shadow-2xl backdrop-blur-2xl">
          <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-emerald-400/30" />
          <p className="mt-5 text-slate-300">Chargement des promotions...</p>
        </div>
      </main>
    );
  }

  return (
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
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
          >
            ← Retour au dashboard
          </a>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/stores"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              🏬 Magasins
            </a>

            <a
              href="/categories"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              🏷️ Catégories
            </a>

            <a
              href="/notifications"
              className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
            >
              🔔 Alertes
            </a>
          </div>
        </header>

        {message && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
            {message}
          </div>
        )}

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_.9fr] lg:items-stretch">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-2xl backdrop-blur-2xl md:p-9">
            <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,.8)]" />
                Promotions actives et personnalisées
              </span>

              <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                Les meilleures{" "}
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                  offres
                </span>{" "}
                pour vous.
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                Retrouvez les promotions publiées par l’admin et filtrées selon
                vos magasins et catégories suivis.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Promos actives</p>
                  <p className="mt-2 text-4xl font-black">{deals.length}</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Pour moi</p>
                  <p className="mt-2 text-4xl font-black">
                    {personalizedDeals.length}
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                  <p className="text-sm text-emerald-200">Préférences</p>
                  <p className="mt-2 text-xl font-black text-emerald-300">
                    {followedStoreIds.length} / {followedCategoryIds.length}
                  </p>
                  <p className="mt-1 text-xs text-emerald-100">
                    magasins / catégories
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
                        "Une offre sélectionnée selon vos préférences PromoPulse."}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {bestDeal.discount_percentage && (
                        <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                          -{bestDeal.discount_percentage}%
                        </span>
                      )}

                      <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">
                        {bestDeal.stores?.name || "Magasin"}
                      </span>
                    </div>

                    <div className="mt-7 rounded-3xl bg-slate-950/50 p-5">
                      <p className="text-sm text-emerald-100">Nouveau prix</p>
                      <p className="mt-1 text-3xl font-black text-white">
                        {formatPrice(bestDeal.new_price)}
                      </p>

                      {bestDeal.old_price && (
                        <p className="mt-1 text-sm text-emerald-100/70 line-through">
                          {formatPrice(bestDeal.old_price)}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="mt-4 text-3xl font-black">
                      Aucune offre disponible
                    </h2>

                    <p className="mt-4 leading-7 text-emerald-100">
                      Les promotions publiées apparaîtront ici dès qu’elles
                      seront disponibles.
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                <p className="text-sm text-emerald-100">
                  Astuce : suivez plus de magasins et catégories pour améliorer
                  vos recommandations.
                </p>
              </div>
            </div>
          </aside>
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
                placeholder="Rechercher une promotion, un magasin, une catégorie ou une ville..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-12 py-4 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {filters.map((item) => {
                const isActive = filter === item.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => setFilter(item.key)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/20"
                        : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isActive
                          ? "bg-slate-950/15 text-slate-950"
                          : "bg-white/[0.06] text-slate-400"
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {deals.length === 0 && (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-400/10 text-3xl">
              🏷️
            </div>

            <h2 className="mt-6 text-2xl font-black">
              Aucune promotion publiée
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
              Les promotions validées par l’administrateur apparaîtront ici dès
              leur publication.
            </p>
          </section>
        )}

        {deals.length > 0 && filteredDeals.length === 0 && (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-3xl">
              🧭
            </div>

            <h2 className="mt-6 text-2xl font-black">
              Aucune promotion ne correspond
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
              Essayez un autre filtre, modifiez votre recherche ou suivez plus
              de magasins et catégories.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="/stores"
                className="inline-flex justify-center rounded-full bg-white px-5 py-2.5 font-bold text-slate-950"
              >
                Choisir mes magasins
              </a>

              <a
                href="/categories"
                className="inline-flex justify-center rounded-full border border-white/10 px-5 py-2.5 font-bold text-white hover:bg-white/[0.06]"
              >
                Choisir mes catégories
              </a>
            </div>
          </section>
        )}

        {filteredDeals.length > 0 && (
          <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredDeals.map((deal) => {
              const days = getDaysUntil(deal.valid_until);
              const isUrgent = days !== null && days <= 3 && days >= 0;

              return (
                <article
                  key={deal.id}
                  className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-emerald-950/30"
                >
                  <div className="relative h-60 overflow-hidden bg-slate-950">
                    {deal.image_url ? (
                      <img
                        src={deal.image_url}
                        alt={deal.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-400/20 via-slate-900 to-slate-950">
                        <span className="text-sm font-black text-emerald-300">
                          PromoPulse
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />

                    <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                      {deal.discount_percentage && (
                        <span className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/30">
                          -{deal.discount_percentage}%
                        </span>
                      )}

                      {isUrgent && (
                        <span className="rounded-full bg-red-400 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-red-500/30">
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
                          {deal.categories?.name || "Catégorie non renseignée"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h2 className="line-clamp-2 text-2xl font-black">
                      {deal.title}
                    </h2>

                    <p className="mt-3 line-clamp-3 leading-7 text-slate-400">
                      {deal.description || "Aucune description disponible."}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                        <p className="text-xs text-slate-500">Ancien prix</p>
                        <p className="mt-1 text-sm text-slate-500 line-through">
                          {formatPrice(deal.old_price)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-right">
                        <p className="text-xs text-emerald-100">Nouveau prix</p>
                        <p className="mt-1 text-xl font-black text-emerald-300">
                          {formatPrice(deal.new_price)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                      <div>
                        <p className="text-xs text-slate-500">Validité</p>
                        <p className="mt-1 text-sm font-semibold text-slate-300">
                          {formatDate(deal.valid_until)}
                        </p>
                      </div>

                      {deal.city && (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300">
                          📍 {deal.city}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}