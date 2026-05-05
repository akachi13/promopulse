"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Profile = {
  full_name: string | null;
  email: string | null;
  whatsapp_number: string | null;
  city: string | null;
  onboarding_completed: boolean | null;
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

function getDaysUntil(date: string | null) {
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diff = targetDate.getTime() - today.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
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
        .select("full_name, email, whatsapp_number, city, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setMessage(`Erreur profil : ${profileError.message}`);
      }

      if (profileData && profileData.onboarding_completed === false) {
        router.push("/onboarding");
        return;
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

  const bestDeal = recommendedDeals[0] || allPublishedDeals[0] || null;

  const maxStores = subscription?.plans?.max_stores || 0;
  const maxCategories = subscription?.plans?.max_categories || 0;

  const storeProgress =
    maxStores > 0 ? Math.min(100, (followedStoreIds.length / maxStores) * 100) : 0;

  const categoryProgress =
    maxCategories > 0
      ? Math.min(100, (followedCategoryIds.length / maxCategories) * 100)
      : 0;

  const daysLeft = getDaysUntil(subscription?.expires_at || null);

  const stats = [
    {
      label: "Magasins suivis",
      value: followedStoreIds.length.toString(),
      helper: maxStores > 0 ? `sur ${maxStores}` : "aucune limite active",
      href: "/stores",
      icon: "🏬",
      tone: "emerald",
    },
    {
      label: "Catégories suivies",
      value: followedCategoryIds.length.toString(),
      helper: maxCategories > 0 ? `sur ${maxCategories}` : "aucune limite active",
      href: "/categories",
      icon: "🏷️",
      tone: "cyan",
    },
    {
      label: "Promos pour moi",
      value: personalizedDeals.length.toString(),
      helper: "personnalisées",
      href: "/deals",
      icon: "✨",
      tone: "emerald",
    },
    {
      label: "Promos publiées",
      value: allPublishedDeals.length.toString(),
      helper: "actives",
      href: "/deals",
      icon: "🔥",
      tone: "amber",
    },
    {
      label: "Alertes reçues",
      value: notificationCount.toString(),
      helper: "notifications",
      href: "/notifications",
      icon: "🔔",
      tone: "violet",
    },
  ];

  const quickActions = [
    {
      title: "Voir mes promotions",
      description: "Accéder aux offres personnalisées.",
      href: "/deals",
      icon: "🔥",
      primary: true,
    },
    {
      title: "Gérer mes magasins",
      description: "Suivre ou retirer des enseignes.",
      href: "/stores",
      icon: "🏬",
    },
    {
      title: "Gérer mes catégories",
      description: "Choisir vos centres d’intérêt.",
      href: "/categories",
      icon: "🏷️",
    },
    {
      title: "Mon abonnement",
      description: "Changer ou vérifier votre formule.",
      href: "/subscription",
      icon: "💳",
    },
  ];

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
          <p className="mt-5 text-slate-300">
            Chargement de votre tableau de bord...
          </p>
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
          <a href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-300 font-black text-slate-950 shadow-lg shadow-emerald-500/25">
              P
            </span>

            <span className="text-2xl font-black tracking-tight">
              Promo<span className="text-emerald-400">Pulse</span>
            </span>
          </a>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/notifications"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              🔔 Alertes
              {notificationCount > 0 && (
                <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-xs font-black text-slate-950">
                  {notificationCount}
                </span>
              )}
            </a>

            <a
              href="/profile"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              👤 Profil
            </a>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-400/20"
            >
              Déconnexion
            </button>
          </div>
        </header>

        {message && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
            {message}
          </div>
        )}

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-2xl backdrop-blur-2xl md:p-9">
            <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,.8)]" />
                Espace utilisateur
              </span>

              <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                {getGreeting()}{" "}
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                  {profile?.full_name || "cher utilisateur"}
                </span>
                .
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                Retrouvez vos promotions personnalisées, vos enseignes suivies,
                vos catégories préférées et vos alertes récentes.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/deals"
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-300 px-6 py-4 font-black text-slate-950 shadow-[0_12px_48px_rgba(16,185,129,.30)] transition hover:-translate-y-0.5"
                >
                  Voir mes promotions
                  <span className="transition group-hover:translate-x-1">→</span>
                </a>

                <a
                  href="/subscription"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
                >
                  Gérer mon abonnement
                </a>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Compte</p>
                  <p className="mt-2 truncate font-bold">
                    {profile?.email || "Email non renseigné"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">WhatsApp</p>
                  <p className="mt-2 truncate font-bold">
                    {profile?.whatsapp_number || "Non renseigné"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Ville</p>
                  <p className="mt-2 truncate font-bold">
                    {profile?.city || "Non renseignée"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-7 shadow-2xl shadow-emerald-950/30 backdrop-blur-2xl">
            <div className="absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-emerald-300/20 blur-3xl" />

            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                Abonnement
              </p>

              {subscription ? (
                <>
                  <h2 className="mt-4 text-3xl font-black">
                    {subscription.plans?.name || "Plan non renseigné"}
                  </h2>

                  <div className="mt-4 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-100">
                    Statut : {subscription.status || "Non renseigné"}
                  </div>

                  <p className="mt-5 text-sm leading-6 text-emerald-100">
                    Expire le :{" "}
                    <span className="font-bold text-white">
                      {formatDate(subscription.expires_at)}
                    </span>
                  </p>

                  {daysLeft !== null && (
                    <p className="mt-2 text-sm text-emerald-100">
                      {daysLeft >= 0
                        ? `${daysLeft} jour(s) restant(s)`
                        : "Abonnement expiré"}
                    </p>
                  )}

                  <div className="mt-7 space-y-5">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-100">Magasins</span>
                        <span className="font-bold text-white">
                          {followedStoreIds.length}/{maxStores}
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-950/40">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-emerald-300 to-teal-200"
                          style={{ width: `${storeProgress}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-100">Catégories</span>
                        <span className="font-bold text-white">
                          {followedCategoryIds.length}/{maxCategories}
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-950/40">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                          style={{ width: `${categoryProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mt-4 text-3xl font-black">
                    Aucun abonnement actif
                  </h2>

                  <p className="mt-4 leading-7 text-emerald-100">
                    Choisissez une formule pour suivre des magasins, des
                    catégories et recevoir des promotions personnalisées.
                  </p>

                  <a
                    href="/subscription"
                    className="mt-7 inline-flex w-full justify-center rounded-2xl bg-white px-6 py-4 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
                  >
                    Choisir une formule
                  </a>
                </>
              )}
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat) => (
            <a
              key={stat.label}
              href={stat.href}
              className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-emerald-950/30"
            >
              <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-400/10 blur-3xl" />
              </div>

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-xl">
                    {stat.icon}
                  </div>

                  <span className="text-slate-600 transition group-hover:text-emerald-300">
                    →
                  </span>
                </div>

                <p className="mt-5 text-sm text-slate-500">{stat.label}</p>
                <p className="mt-2 text-4xl font-black">{stat.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {stat.helper}
                </p>
              </div>
            </a>
          ))}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Actions rapides
                </p>
                <h2 className="mt-3 text-2xl font-black">
                  Pilotez vos préférences
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {quickActions.map((action) => (
                <a
                  key={action.title}
                  href={action.href}
                  className={`group rounded-3xl border p-5 transition hover:-translate-y-0.5 ${
                    action.primary
                      ? "border-emerald-400/30 bg-emerald-400/10"
                      : "border-white/10 bg-slate-950/50 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${
                        action.primary
                          ? "bg-emerald-400 text-slate-950"
                          : "bg-white/[0.05]"
                      }`}
                    >
                      {action.icon}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold">{action.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {action.description}
                      </p>
                    </div>

                    <span className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-300">
                      →
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Recommandations
                </p>
                <h2 className="mt-3 text-2xl font-black">
                  Promotions pour vous
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Les dernières offres publiées correspondant à vos magasins ou
                  catégories suivis.
                </p>
              </div>

              <a
                href="/deals"
                className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-white/[0.08]"
              >
                Voir toutes →
              </a>
            </div>

            {recommendedDeals.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/50 p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl">
                  🧭
                </div>

                <h3 className="mt-5 text-xl font-bold">
                  Aucune promotion personnalisée pour le moment
                </h3>

                <p className="mt-3 leading-7 text-slate-400">
                  Choisissez quelques magasins et catégories pour améliorer vos
                  recommandations.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {recommendedDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/50 transition hover:-translate-y-1 hover:border-emerald-400/30 hover:shadow-2xl hover:shadow-emerald-950/30"
                  >
                    {deal.image_url ? (
                      <div className="h-40 overflow-hidden bg-slate-900">
                        <img
                          src={deal.image_url}
                          alt={deal.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center bg-gradient-to-br from-emerald-400/20 to-slate-950">
                        <span className="text-sm font-bold text-emerald-300">
                          PromoPulse
                        </span>
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex flex-wrap gap-2">
                        {deal.discount_percentage && (
                          <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-slate-950">
                            -{deal.discount_percentage}%
                          </span>
                        )}

                        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-slate-300">
                          {deal.stores?.name || "Magasin"}
                        </span>
                      </div>

                      <h3 className="mt-4 line-clamp-2 text-lg font-black">
                        {deal.title}
                      </h3>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                        {deal.description || "Aucune description disponible."}
                      </p>

                      <div className="mt-5 rounded-2xl bg-white/[0.04] p-4">
                        <p className="text-xs text-slate-500">Nouveau prix</p>
                        <p className="mt-1 text-xl font-black text-emerald-300">
                          {formatPrice(deal.new_price)}
                        </p>

                        {deal.old_price && (
                          <p className="mt-1 text-xs text-slate-600 line-through">
                            {formatPrice(deal.old_price)}
                          </p>
                        )}
                      </div>

                      <p className="mt-4 text-xs text-slate-500">
                        Jusqu’au {formatDate(deal.valid_until)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {bestDeal && (
          <section className="mt-8 overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/15 via-white/[0.04] to-slate-950 p-7 backdrop-blur-xl md:p-8">
            <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Offre mise en avant
                </p>

                <h2 className="mt-4 text-3xl font-black md:text-4xl">
                  {bestDeal.title}
                </h2>

                <p className="mt-4 max-w-2xl leading-7 text-slate-400">
                  {bestDeal.description ||
                    "Une offre intéressante sélectionnée selon vos préférences PromoPulse."}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="rounded-full bg-white/[0.08] px-4 py-2 text-sm text-slate-300">
                    {bestDeal.stores?.name || "Magasin non renseigné"}
                  </span>

                  <span className="rounded-full bg-white/[0.08] px-4 py-2 text-sm text-slate-300">
                    {bestDeal.categories?.name || "Catégorie non renseignée"}
                  </span>

                  {bestDeal.discount_percentage && (
                    <span className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950">
                      -{bestDeal.discount_percentage}%
                    </span>
                  )}
                </div>

                <a
                  href="/deals"
                  className="mt-7 inline-flex rounded-2xl bg-white px-6 py-3 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  Consulter les promotions
                </a>
              </div>

              <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/60">
                {bestDeal.image_url ? (
                  <img
                    src={bestDeal.image_url}
                    alt={bestDeal.title}
                    className="h-72 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-72 items-center justify-center bg-gradient-to-br from-emerald-400/20 to-slate-950">
                    <span className="text-lg font-black text-emerald-300">
                      PromoPulse
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}