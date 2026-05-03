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

function getStatusLabel(status: string | null, expiresAt: string | null) {
  if (isExpired(expiresAt)) return "Expiré";
  if (status === "active") return "Actif";
  if (status === "cancelled") return "Annulé";
  if (status === "expired") return "Expiré";
  if (status === "pending") return "En attente";
  return status || "Non renseigné";
}

function getStatusClass(status: string | null, expiresAt: string | null) {
  if (isExpired(expiresAt) || status === "expired") {
    return "bg-red-400/20 text-red-300";
  }

  if (status === "active") {
    return "bg-emerald-400/20 text-emerald-300";
  }

  if (status === "pending") {
    return "bg-amber-400/20 text-amber-200";
  }

  if (status === "cancelled") {
    return "bg-slate-400/20 text-slate-300";
  }

  return "bg-white/10 text-slate-300";
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

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-slate-300">Chargement des abonnements...</p>
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
            <h1 className="text-4xl font-bold">Mon abonnement</h1>
            <p className="mt-2 max-w-3xl text-slate-300">
              Choisissez une formule adaptée à vos besoins de suivi de magasins,
              de catégories et d’alertes promotionnelles.
            </p>
          </div>

          <button
            onClick={loadSubscriptionData}
            disabled={isLoading}
            className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            Actualiser
          </button>
        </div>

        {message && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
            {message}
          </div>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm text-slate-400">Abonnement actuel</p>

                {subscription ? (
                  <>
                    <h2 className="mt-3 text-3xl font-bold">
                      {subscription.plans?.name || "Plan non renseigné"}
                    </h2>

                    <p className="mt-2 text-slate-300">
                      Statut :{" "}
                      <span className="font-semibold text-emerald-300">
                        {getStatusLabel(
                          subscription.status,
                          subscription.expires_at
                        )}
                      </span>
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Début : {formatDate(subscription.started_at)}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Expire le : {formatDate(subscription.expires_at)}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-3 text-3xl font-bold">
                      Aucun abonnement actif
                    </h2>

                    <p className="mt-2 text-slate-300">
                      Choisissez une formule pour commencer à suivre vos
                      magasins et catégories préférés.
                    </p>
                  </>
                )}
              </div>

              {subscription && (
                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                    subscription.status,
                    subscription.expires_at
                  )}`}
                >
                  {getStatusLabel(subscription.status, subscription.expires_at)}
                </span>
              )}
            </div>

            {subscription && (
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">
                  <p className="text-sm text-slate-400">Magasins suivis</p>
                  <p className="mt-2 text-3xl font-bold">
                    {followedStoreCount}/{currentMaxStores}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Restants : {remainingStores}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">
                  <p className="text-sm text-slate-400">Catégories suivies</p>
                  <p className="mt-2 text-3xl font-bold">
                    {followedCategoryCount}/{currentMaxCategories}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Restantes : {remainingCategories}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">
                  <p className="text-sm text-slate-400">Alertes</p>
                  <p className="mt-2 text-xl font-bold">
                    {formatFrequency(
                      currentPlan?.notification_frequency || null
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Fréquence du plan
                  </p>
                </div>
              </div>
            )}

            {subscription && isExpired(subscription.expires_at) && (
              <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
                Votre abonnement est expiré. Choisissez une formule ci-dessous
                pour le réactiver.
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6">
            <p className="text-sm font-semibold text-emerald-200">
              Comment fonctionnent les limites ?
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              Chaque plan définit vos préférences.
            </h2>

            <p className="mt-3 leading-7 text-emerald-100">
              Le nombre de magasins et de catégories suivis détermine les
              promotions personnalisées que vous verrez dans votre dashboard et
              dans la page Mes promotions.
            </p>

            <div className="mt-6 space-y-3 text-sm text-emerald-100">
              <p>✓ Plus de magasins suivis = plus d’offres ciblées.</p>
              <p>✓ Plus de catégories suivies = meilleure personnalisation.</p>
              <p>✓ Les alertes dépendent de la fréquence de votre formule.</p>
              <p>
                ✓ Si vous choisissez une formule plus petite, les choix
                excédentaires sont retirés automatiquement.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">Choisir une formule</h2>
          <p className="mt-2 text-slate-300">
            Vous pouvez changer de formule à tout moment. La nouvelle formule
            remplace l’abonnement actuel.
          </p>

          {plans.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Aucun plan actif n’est disponible pour le moment.
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => {
                const isCurrentPlan = subscription?.plan_id === plan.id;
                const isSelecting = selectedPlanId === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-[2rem] border p-8 ${
                      isCurrentPlan
                        ? "border-emerald-400 bg-emerald-400/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold">{plan.name}</h3>
                        <p className="mt-3 leading-7 text-slate-300">
                          {plan.description || "Formule PromoPulse."}
                        </p>
                      </div>

                      {isCurrentPlan && (
                        <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950">
                          Actuel
                        </span>
                      )}
                    </div>

                    <p className="mt-8 text-4xl font-bold">
                      {formatPrice(plan.price)}
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      Facturation : {formatBillingPeriod(plan.billing_period)}
                    </p>

                    <ul className="mt-8 space-y-4 text-slate-300">
                      <li>✓ {plan.max_stores || 0} magasins suivis</li>
                      <li>✓ {plan.max_categories || 0} catégories suivies</li>
                      <li>
                        ✓ Alertes :{" "}
                        {formatFrequency(plan.notification_frequency)}
                      </li>
                    </ul>

                    <button
                      onClick={() => choosePlan(plan)}
                      disabled={isSelecting || isCurrentPlan}
                      className={`mt-8 w-full rounded-full px-6 py-3 font-semibold transition disabled:opacity-60 ${
                        isCurrentPlan
                          ? "border border-emerald-400/40 text-emerald-300"
                          : "bg-white text-slate-950 hover:bg-slate-200"
                      }`}
                    >
                      {isCurrentPlan
                        ? "Formule actuelle"
                        : isSelecting
                          ? "Activation..."
                          : "Choisir cette formule"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}