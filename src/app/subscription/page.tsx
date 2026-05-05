"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  billing_period: string | null;
  max_stores: number | null;
  max_categories: number | null;
  notification_frequency: string | null;
};

type Subscription = {
  id: string;
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
  plan_id: string | null;
  plans: {
    name: string;
    slug: string;
    max_stores: number | null;
    max_categories: number | null;
    notification_frequency: string | null;
  } | null;
};

function formatPrice(price: number | null) {
  if (!price || price === 0) return "Gratuit";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatFrequency(value: string | null) {
  if (value === "weekly") return "Hebdomadaire";
  if (value === "daily") return "Quotidienne";
  if (value === "instant") return "Instantanée";
  return value || "Non définie";
}

function formatBillingPeriod(value: string | null) {
  if (value === "monthly") return "Mensuelle";
  if (value === "yearly") return "Annuelle";
  if (value === "weekly") return "Hebdomadaire";
  return value || "Non définie";
}

function formatDate(date: string | null) {
  if (!date) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function isExpired(date: string | null) {
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(date);
  expiryDate.setHours(0, 0, 0, 0);

  return expiryDate < today;
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

function getStatusLabel(status: string | null, expiresAt: string | null) {
  if (isExpired(expiresAt)) return "Expiré";
  if (status === "active") return "Actif";
  if (status === "cancelled") return "Annulé";
  if (status === "expired") return "Expiré";
  if (status === "pending") return "En attente";
  return status || "Non renseigné";
}

function calculateExpiryDate(billingPeriod: string | null) {
  const expiresAt = new Date();

  if (billingPeriod === "monthly") {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    return expiresAt;
  }

  if (billingPeriod === "weekly") {
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
  }

  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  return expiresAt;
}

function getPlanVisual(index: number) {
  const visuals = [
    {
      icon: "🌱",
      label: "Découverte",
      gradient: "from-emerald-400/15 to-slate-950",
    },
    {
      icon: "⚡",
      label: "Populaire",
      gradient: "from-emerald-400 to-teal-300",
    },
    {
      icon: "👑",
      label: "Premium",
      gradient: "from-cyan-400/15 to-emerald-400/10",
    },
  ];

  return visuals[index % visuals.length];
}

export default function SubscriptionPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [followedStoreCount, setFollowedStoreCount] = useState(0);
  const [followedCategoryCount, setFollowedCategoryCount] = useState(0);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  async function loadSubscriptionData() {
    setIsLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);

    const { data: plansData, error: plansError } = await supabase
      .from("plans")
      .select(
        "id, name, slug, description, price, billing_period, max_stores, max_categories, notification_frequency"
      )
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (plansError) {
      setMessage(`Erreur plans : ${plansError.message}`);
    }

    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select(
        `
        id,
        status,
        started_at,
        expires_at,
        plan_id,
        plans(name, slug, max_stores, max_categories, notification_frequency)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      setMessage(`Erreur abonnement : ${subscriptionError.message}`);
    }

    const { count: storeCount } = await supabase
      .from("user_stores")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: categoryCount } = await supabase
      .from("user_categories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    setPlans((plansData || []) as Plan[]);
    setSubscription(subscriptionData as unknown as Subscription | null);
    setFollowedStoreCount(storeCount || 0);
    setFollowedCategoryCount(categoryCount || 0);
    setIsLoading(false);
  }

  useEffect(() => {
    loadSubscriptionData();
  }, [router]);

  async function adjustPreferencesToPlan(plan: Plan) {
    if (!userId) {
      return {
        removedStores: 0,
        removedCategories: 0,
      };
    }

    const maxStores = plan.max_stores || 0;
    const maxCategories = plan.max_categories || 0;

    const { data: userStoresData, error: userStoresError } = await supabase
      .from("user_stores")
      .select("store_id")
      .eq("user_id", userId);

    if (userStoresError) {
      throw new Error(userStoresError.message);
    }

    const { data: userCategoriesData, error: userCategoriesError } =
      await supabase
        .from("user_categories")
        .select("category_id")
        .eq("user_id", userId);

    if (userCategoriesError) {
      throw new Error(userCategoriesError.message);
    }

    const storeIds = (userStoresData || []).map(
      (item) => item.store_id as string
    );

    const categoryIds = (userCategoriesData || []).map(
      (item) => item.category_id as string
    );

    const storesToKeep = storeIds.slice(0, maxStores);
    const categoriesToKeep = categoryIds.slice(0, maxCategories);

    const storesToRemove = storeIds.filter((id) => !storesToKeep.includes(id));

    const categoriesToRemove = categoryIds.filter(
      (id) => !categoriesToKeep.includes(id)
    );

    if (storesToRemove.length > 0) {
      const { error } = await supabase
        .from("user_stores")
        .delete()
        .eq("user_id", userId)
        .in("store_id", storesToRemove);

      if (error) {
        throw new Error(error.message);
      }
    }

    if (categoriesToRemove.length > 0) {
      const { error } = await supabase
        .from("user_categories")
        .delete()
        .eq("user_id", userId)
        .in("category_id", categoriesToRemove);

      if (error) {
        throw new Error(error.message);
      }
    }

    setFollowedStoreCount(storesToKeep.length);
    setFollowedCategoryCount(categoriesToKeep.length);

    return {
      removedStores: storesToRemove.length,
      removedCategories: categoriesToRemove.length,
    };
  }

  async function choosePlan(plan: Plan) {
    if (!userId) return;

    setMessage("");
    setSelectedPlanId(plan.id);

    const expiresAt = calculateExpiryDate(plan.billing_period);

    if (subscription?.id) {
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          plan_id: plan.id,
          status: "active",
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)
        .select(
          `
          id,
          status,
          started_at,
          expires_at,
          plan_id,
          plans(name, slug, max_stores, max_categories, notification_frequency)
        `
        )
        .single();

      if (error) {
        setSelectedPlanId(null);
        setMessage(`Erreur : ${error.message}`);
        return;
      }

      try {
        const cleanup = await adjustPreferencesToPlan(plan);

        setSubscription(data as unknown as Subscription);

        const cleanupMessage =
          cleanup.removedStores > 0 || cleanup.removedCategories > 0
            ? ` ${cleanup.removedStores} magasin(s) et ${cleanup.removedCategories} catégorie(s) ont été retiré(s) pour respecter les limites de la nouvelle formule.`
            : "";

        setMessage(
          `Votre abonnement a été mis à jour avec succès.${cleanupMessage}`
        );
      } catch (cleanupError) {
        setSubscription(data as unknown as Subscription);

        setMessage(
          cleanupError instanceof Error
            ? `Abonnement mis à jour, mais erreur lors de l’ajustement des préférences : ${cleanupError.message}`
            : "Abonnement mis à jour, mais erreur lors de l’ajustement des préférences."
        );
      }

      setSelectedPlanId(null);
      return;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: plan.id,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select(
        `
        id,
        status,
        started_at,
        expires_at,
        plan_id,
        plans(name, slug, max_stores, max_categories, notification_frequency)
      `
      )
      .single();

    if (error) {
      setSelectedPlanId(null);
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    try {
      const cleanup = await adjustPreferencesToPlan(plan);

      setSubscription(data as unknown as Subscription);

      const cleanupMessage =
        cleanup.removedStores > 0 || cleanup.removedCategories > 0
          ? ` ${cleanup.removedStores} magasin(s) et ${cleanup.removedCategories} catégorie(s) ont été retiré(s) pour respecter les limites de la formule.`
          : "";

      setMessage(`Votre abonnement a été activé avec succès.${cleanupMessage}`);
    } catch (cleanupError) {
      setSubscription(data as unknown as Subscription);

      setMessage(
        cleanupError instanceof Error
          ? `Abonnement activé, mais erreur lors de l’ajustement des préférences : ${cleanupError.message}`
          : "Abonnement activé, mais erreur lors de l’ajustement des préférences."
      );
    }

    setSelectedPlanId(null);
  }

  const currentPlan = subscription?.plans;
  const currentMaxStores = currentPlan?.max_stores || 0;
  const currentMaxCategories = currentPlan?.max_categories || 0;

  const remainingStores = Math.max(0, currentMaxStores - followedStoreCount);
  const remainingCategories = Math.max(
    0,
    currentMaxCategories - followedCategoryCount
  );

  const storeProgress =
    currentMaxStores > 0
      ? Math.min(100, (followedStoreCount / currentMaxStores) * 100)
      : 0;

  const categoryProgress =
    currentMaxCategories > 0
      ? Math.min(100, (followedCategoryCount / currentMaxCategories) * 100)
      : 0;

  const subscriptionExpired = subscription
    ? isExpired(subscription.expires_at)
    : false;

  const daysLeft = getDaysUntil(subscription?.expires_at || null);

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
          <p className="mt-5 text-slate-300">Chargement des abonnements...</p>
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

            <button
              onClick={loadSubscriptionData}
              className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
            >
              Actualiser
            </button>
          </div>
        </header>

        {message && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-slate-200 backdrop-blur-xl">
            {message}
          </div>
        )}

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-2xl backdrop-blur-2xl md:p-9">
            <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,.8)]" />
                Abonnement PromoPulse
              </span>

              <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                Choisissez une{" "}
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                  formule
                </span>{" "}
                adaptée.
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                Votre abonnement définit le nombre de magasins, de catégories et
                la fréquence des alertes que vous pouvez utiliser.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Plan actuel</p>
                  <p className="mt-2 truncate text-xl font-black">
                    {currentPlan?.name || "Aucun plan"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Statut</p>
                  <p
                    className={`mt-2 text-xl font-black ${
                      subscriptionExpired ? "text-red-300" : "text-emerald-300"
                    }`}
                  >
                    {subscription
                      ? getStatusLabel(subscription.status, subscription.expires_at)
                      : "Non actif"}
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                  <p className="text-sm text-emerald-200">Expiration</p>
                  <p className="mt-2 text-xl font-black text-emerald-300">
                    {subscription?.expires_at
                      ? daysLeft !== null && daysLeft >= 0
                        ? `${daysLeft} j`
                        : "Expiré"
                      : "—"}
                  </p>
                  <p className="mt-1 text-xs text-emerald-100">
                    {formatDate(subscription?.expires_at || null)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-7 shadow-2xl shadow-emerald-950/30 backdrop-blur-2xl">
            <div className="absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-emerald-300/20 blur-3xl" />

            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                Utilisation actuelle
              </p>

              <h2 className="mt-4 text-3xl font-black">
                Vos limites PromoPulse
              </h2>

              <p className="mt-4 leading-7 text-emerald-100">
                Vos préférences sont automatiquement ajustées si vous choisissez
                une formule plus petite.
              </p>

              <div className="mt-7 space-y-6">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-100">Magasins suivis</span>
                    <span className="font-bold text-white">
                      {followedStoreCount}/{currentMaxStores}
                    </span>
                  </div>

                  <div className="mt-3 h-3 rounded-full bg-slate-950/40">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-emerald-300 to-teal-200"
                      style={{ width: `${storeProgress}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-emerald-100">
                    Restants : {remainingStores}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-100">Catégories suivies</span>
                    <span className="font-bold text-white">
                      {followedCategoryCount}/{currentMaxCategories}
                    </span>
                  </div>

                  <div className="mt-3 h-3 rounded-full bg-slate-950/40">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                      style={{ width: `${categoryProgress}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-emerald-100">
                    Restantes : {remainingCategories}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {subscription && subscriptionExpired && (
          <div className="mt-8 rounded-[2rem] border border-red-400/30 bg-red-400/10 p-5 text-red-200 backdrop-blur-xl">
            Votre abonnement est expiré. Choisissez une formule ci-dessous pour
            réactiver votre accès.
          </div>
        )}

        {!subscription && (
          <div className="mt-8 rounded-[2rem] border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100 backdrop-blur-xl">
            Aucun abonnement actif détecté. Choisissez une formule pour commencer
            à personnaliser vos promotions.
          </div>
        )}

        <section className="mt-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">
              Formules disponibles
            </p>

            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
              Sélectionnez votre niveau d’accès.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-400">
              Vous pouvez changer de formule à tout moment. Si la nouvelle
              formule est plus petite, les préférences excédentaires sont
              retirées automatiquement.
            </p>
          </div>

          {plans.length === 0 ? (
            <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-3xl">
                💳
              </div>

              <h3 className="mt-6 text-2xl font-black">
                Aucun plan disponible
              </h3>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
                Aucun plan actif n’est actuellement disponible. Vérifiez la
                configuration côté administration.
              </p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {plans.map((plan, index) => {
                const visual = getPlanVisual(index);
                const isCurrentPlan = subscription?.plan_id === plan.id;
                const isSelecting = selectedPlanId === plan.id;
                const canReactivateCurrent =
                  isCurrentPlan &&
                  subscription !== null &&
                  isExpired(subscription.expires_at);

                const disabled =
                  isSelecting || (isCurrentPlan && !canReactivateCurrent);

                return (
                  <article
                    key={plan.id}
                    className={`relative overflow-hidden rounded-[2rem] border p-8 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl ${
                      isCurrentPlan
                        ? "border-emerald-400/50 bg-emerald-400/10 shadow-emerald-950/40"
                        : index === 1
                        ? "border-emerald-300 bg-gradient-to-br from-emerald-400 to-teal-300 text-slate-950 shadow-emerald-500/25"
                        : "border-white/10 bg-white/[0.04] hover:border-emerald-400/30 hover:bg-white/[0.07] hover:shadow-emerald-950/30"
                    }`}
                  >
                    <div
                      className={`absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-gradient-to-br ${visual.gradient} blur-3xl`}
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${
                            index === 1
                              ? "bg-slate-950 text-white"
                              : "border border-white/10 bg-white/[0.06]"
                          }`}
                        >
                          {visual.icon}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {index === 1 && !isCurrentPlan && (
                            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                              Populaire
                            </span>
                          )}

                          {isCurrentPlan && (
                            <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-slate-950">
                              Actuel
                            </span>
                          )}
                        </div>
                      </div>

                      <p
                        className={`mt-7 text-xs font-bold uppercase tracking-[0.25em] ${
                          index === 1 ? "text-slate-800" : "text-emerald-300"
                        }`}
                      >
                        {visual.label}
                      </p>

                      <h3 className="mt-3 text-3xl font-black">{plan.name}</h3>

                      <p
                        className={`mt-4 min-h-20 leading-7 ${
                          index === 1 ? "text-slate-800" : "text-slate-400"
                        }`}
                      >
                        {plan.description || "Formule PromoPulse."}
                      </p>

                      <p className="mt-8 text-5xl font-black">
                        {formatPrice(plan.price)}
                      </p>

                      <p
                        className={`mt-2 text-sm ${
                          index === 1 ? "text-slate-800" : "text-slate-500"
                        }`}
                      >
                        Facturation : {formatBillingPeriod(plan.billing_period)}
                      </p>

                      <div
                        className={`mt-8 space-y-4 rounded-3xl p-5 ${
                          index === 1
                            ? "bg-slate-950/10"
                            : "border border-white/10 bg-slate-950/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                              index === 1
                                ? "bg-slate-950 text-white"
                                : "bg-emerald-400 text-slate-950"
                            }`}
                          >
                            ✓
                          </span>
                          <span className="font-semibold">
                            {plan.max_stores || 0} magasins suivis
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                              index === 1
                                ? "bg-slate-950 text-white"
                                : "bg-emerald-400 text-slate-950"
                            }`}
                          >
                            ✓
                          </span>
                          <span className="font-semibold">
                            {plan.max_categories || 0} catégories suivies
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                              index === 1
                                ? "bg-slate-950 text-white"
                                : "bg-emerald-400 text-slate-950"
                            }`}
                          >
                            ✓
                          </span>
                          <span className="font-semibold">
                            Alertes : {formatFrequency(plan.notification_frequency)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => choosePlan(plan)}
                        disabled={disabled}
                        className={`mt-8 w-full rounded-2xl px-6 py-4 font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          isCurrentPlan && !canReactivateCurrent
                            ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : index === 1
                            ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20 hover:-translate-y-0.5"
                            : "bg-white text-slate-950 hover:-translate-y-0.5 hover:bg-slate-100"
                        }`}
                      >
                        {isSelecting
                          ? "Activation..."
                          : isCurrentPlan && !canReactivateCurrent
                          ? "Formule actuelle"
                          : isCurrentPlan && canReactivateCurrent
                          ? "Réactiver cette formule"
                          : "Choisir cette formule"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-12 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl md:p-8">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">
                Règles importantes
              </p>

              <h2 className="mt-4 text-3xl font-black">
                Comment PromoPulse applique vos limites.
              </h2>

              <p className="mt-4 leading-7 text-slate-400">
                Votre formule contrôle le nombre de magasins et catégories que
                vous pouvez suivre. Ces préférences déterminent ensuite vos
                promotions personnalisées.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl">
                  ⬆️
                </div>

                <h3 className="mt-5 font-black">Formule supérieure</h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Vos choix actuels sont conservés et vous gagnez de nouvelles
                  places disponibles.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-2xl">
                  ⬇️
                </div>

                <h3 className="mt-5 font-black">Formule inférieure</h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Les magasins et catégories excédentaires sont retirés
                  automatiquement.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}