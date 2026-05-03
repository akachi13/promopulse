"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Profile = {
  full_name: string | null;
  email: string | null;
  whatsapp_number: string | null;
  city: string | null;
};

type Deal = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  old_price: number | null;
  new_price: number | null;
  discount_percentage: number | null;
  valid_until: string | null;
  store_id: string | null;
  category_id: string | null;
  stores: {
    name: string;
  } | null;
  categories: {
    name: string;
  } | null;
};

type Subscription = {
  id: string;
  status: string | null;
  expires_at: string | null;
  plans: {
    name: string;
    slug: string;
    max_stores: number | null;
    max_categories: number | null;
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
  if (!date) return "Non renseignée";

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

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [allPublishedDeals, setAllPublishedDeals] = useState<Deal[]>([]);
  const [personalizedDeals, setPersonalizedDeals] = useState<Deal[]>([]);
  const [followedStoreIds, setFollowedStoreIds] = useState<string[]>([]);
  const [followedCategoryIds, setFollowedCategoryIds] = useState<string[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, whatsapp_number, city")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setMessage(`Erreur profil : ${profileError.message}`);
      }

      const { data: subscriptionData } = await supabase
        .from("subscriptions")
        .select(
          `
          id,
          status,
          expires_at,
          plans(name, slug, max_stores, max_categories)
        `
        )
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

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

      const { count: sentNotificationsCount } = await supabase
        .from("notification_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

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
          store_id,
          category_id,
          stores(name),
          categories(name)
        `
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (dealsError) {
        setMessage(`Erreur promotions : ${dealsError.message}`);
        setIsLoading(false);
        return;
      }

      const validDeals = ((dealsData || []) as unknown as Deal[]).filter(
        (deal) => isDealStillValid(deal.valid_until)
      );

      const hasPreferences = storeIds.length > 0 || categoryIds.length > 0;

      const userDeals = hasPreferences
        ? validDeals.filter((deal) => {
            const matchesStore =
              deal.store_id !== null && storeIds.includes(deal.store_id);

            const matchesCategory =
              deal.category_id !== null &&
              categoryIds.includes(deal.category_id);

            return matchesStore || matchesCategory;
          })
        : validDeals;

      setProfile(profileData as Profile | null);
      setSubscription(subscriptionData as unknown as Subscription | null);
      setFollowedStoreIds(storeIds);
      setFollowedCategoryIds(categoryIds);
      setNotificationCount(sentNotificationsCount || 0);
      setAllPublishedDeals(validDeals);
      setPersonalizedDeals(userDeals);
      setIsLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const recommendedDeals = useMemo(() => {
    return personalizedDeals.slice(0, 3);
  }, [personalizedDeals]);

  const stats = [
    {
      label: "Magasins suivis",
      value: followedStoreIds.length.toString(),
      href: "/stores",
    },
    {
      label: "Catégories suivies",
      value: followedCategoryIds.length.toString(),
      href: "/categories",
    },
    {
      label: "Promos pour moi",
      value: personalizedDeals.length.toString(),
      href: "/deals",
    },
    {
      label: "Promos publiées",
      value: allPublishedDeals.length.toString(),
      href: "/deals",
    },
    {
      label: "Alertes reçues",
      value: notificationCount.toString(),
      href: "/notifications",
    },
  ];

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-slate-300">Chargement du tableau de bord...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <a href="/" className="text-xl font-bold">
              Promo<span className="text-emerald-400">Pulse</span>
            </a>

            <h1 className="mt-8 text-4xl font-bold">
              Bonjour {profile?.full_name || "cher utilisateur"} 👋
            </h1>

            <p className="mt-2 max-w-3xl text-slate-300">
              Retrouvez vos promotions personnalisées, vos magasins suivis, vos
              catégories et vos alertes récentes.
            </p>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Compte connecté</p>

                <p className="mt-2 font-semibold">
                  {profile?.email || "Email non renseigné"}
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  WhatsApp : {profile?.whatsapp_number || "Non renseigné"}
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  Ville : {profile?.city || "Non renseignée"}
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-sm text-emerald-200">Abonnement actuel</p>

                {subscription ? (
                  <>
                    <h2 className="mt-2 text-2xl font-bold">
                      {subscription.plans?.name || "Plan non renseigné"}
                    </h2>

                    <p className="mt-2 text-sm text-emerald-100">
                      Statut : {subscription.status || "Non renseigné"}
                    </p>

                    <p className="mt-1 text-sm text-emerald-100">
                      Expire le : {formatDate(subscription.expires_at)}
                    </p>

                    <p className="mt-3 text-xs text-emerald-100">
                      Limites : {subscription.plans?.max_stores || 0} magasins /{" "}
                      {subscription.plans?.max_categories || 0} catégories
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-2 text-2xl font-bold">
                      Aucun abonnement actif
                    </h2>

                    <p className="mt-2 text-sm text-emerald-100">
                      Choisissez une formule pour suivre des magasins et des
                      catégories.
                    </p>

                    <a
                      href="/subscription"
                      className="mt-4 inline-flex rounded-full bg-emerald-400 px-5 py-2.5 font-semibold text-slate-950"
                    >
                      Choisir une formule
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <a
              href="/deals"
              className="rounded-full bg-emerald-400 px-6 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-300"
            >
              Mes promotions
            </a>

            <a
              href="/stores"
              className="rounded-full bg-white px-6 py-3 text-center font-semibold text-slate-950 hover:bg-slate-200"
            >
              Mes magasins
            </a>

            <a
              href="/categories"
              className="rounded-full bg-white px-6 py-3 text-center font-semibold text-slate-950 hover:bg-slate-200"
            >
              Mes catégories
            </a>

            <a
              href="/subscription"
              className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold text-white hover:bg-white/10"
            >
              Mon abonnement
            </a>

            <a
              href="/notifications"
              className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold text-white hover:bg-white/10"
            >
              Mes alertes
            </a>

            <a
              href="/profile"
              className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold text-white hover:bg-white/10"
            >
              Mon profil
            </a>

            <a
              href="/settings/whatsapp"
              className="rounded-full border border-emerald-400/40 px-6 py-3 text-center font-semibold text-emerald-300 hover:bg-emerald-400/10"
            >
              Paramètres WhatsApp
            </a>

            <button
              onClick={handleLogout}
              className="rounded-full border border-red-400/40 px-6 py-3 font-semibold text-red-300 hover:bg-red-400/10"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
            {message}
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Mes statistiques</h2>
          <p className="mt-2 text-slate-300">
            Vue rapide de votre activité PromoPulse.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {stats.map((stat) => (
              <a
                key={stat.label}
                href={stat.href}
                className="rounded-[2rem] border border-white/10 bg-white/5 p-6 transition hover:border-emerald-400/40 hover:bg-white/10"
              >
                <p className="text-sm text-slate-400">{stat.label}</p>
                <p className="mt-4 text-4xl font-bold">{stat.value}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Promotions recommandées</h2>

              <p className="mt-2 text-slate-300">
                Voici les dernières promotions publiées correspondant à vos
                magasins ou catégories suivis.
              </p>
            </div>

            <a href="/deals" className="text-sm font-semibold text-emerald-300">
              Voir toutes les promotions →
            </a>
          </div>

          {recommendedDeals.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <p className="text-slate-300">
                Aucune promotion personnalisée disponible pour le moment.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/stores"
                  className="rounded-full bg-white px-5 py-2.5 text-center font-semibold text-slate-950"
                >
                  Choisir mes magasins
                </a>

                <a
                  href="/categories"
                  className="rounded-full border border-white/20 px-5 py-2.5 text-center font-semibold text-white hover:bg-white/10"
                >
                  Choisir mes catégories
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {recommendedDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5"
                >
                  {deal.image_url ? (
                    <div className="h-44 overflow-hidden bg-slate-900">
                      <img
                        src={deal.image_url}
                        alt={deal.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-emerald-400/10">
                      <span className="text-sm font-semibold text-emerald-300">
                        PromoPulse
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-400/20" />

                      {deal.discount_percentage && (
                        <span className="rounded-full bg-emerald-400 px-3 py-1 text-sm font-bold text-slate-950">
                          -{deal.discount_percentage}%
                        </span>
                      )}
                    </div>

                    <h3 className="mt-5 text-xl font-semibold">{deal.title}</h3>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                        {deal.stores?.name || "Magasin non renseigné"}
                      </span>

                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                        {deal.categories?.name || "Catégorie non renseignée"}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">
                      {deal.description || "Aucune description disponible."}
                    </p>

                    <div className="mt-5 rounded-2xl bg-slate-900 p-4">
                      <p className="text-sm text-slate-400">Nouveau prix</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-300">
                        {formatPrice(deal.new_price)}
                      </p>

                      {deal.old_price && (
                        <p className="mt-1 text-sm text-slate-500 line-through">
                          {formatPrice(deal.old_price)}
                        </p>
                      )}
                    </div>

                    <p className="mt-4 text-sm text-slate-400">
                      Valable jusqu’au :{" "}
                      <span className="text-slate-200">
                        {formatDate(deal.valid_until)}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}