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
  } | null;
};

function formatPrice(price: number | null) {
  if (!price || price === 0) return "À définir";

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

function formatDate(date: string | null) {
  if (!date) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function SubscriptionPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubscriptionData() {
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

      const { data: subscriptionData } = await supabase
        .from("subscriptions")
        .select(
          `
          id,
          status,
          started_at,
          expires_at,
          plan_id,
          plans(name, slug)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setPlans((plansData || []) as Plan[]);
      setSubscription(subscriptionData as unknown as Subscription | null);
      setIsLoading(false);
    }

    loadSubscriptionData();
  }, [router]);

  async function choosePlan(planId: string) {
    if (!userId) return;

    setMessage("");
    setSelectedPlanId(planId);

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    if (subscription?.id) {
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          plan_id: planId,
          status: "active",
          renewed_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", subscription.id)
        .select(
          `
          id,
          status,
          started_at,
          expires_at,
          plan_id,
          plans(name, slug)
        `
        )
        .single();

      setSelectedPlanId(null);

      if (error) {
        setMessage(`Erreur : ${error.message}`);
        return;
      }

      setSubscription(data as unknown as Subscription);
      setMessage("Votre abonnement a été mis à jour avec succès.");
      return;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: planId,
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
        plans(name, slug)
      `
      )
      .single();

    setSelectedPlanId(null);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setSubscription(data as unknown as Subscription);
    setMessage("Votre abonnement a été activé avec succès.");
  }

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

        <div className="mt-8">
          <h1 className="text-4xl font-bold">Mon abonnement</h1>
          <p className="mt-2 text-slate-300">
            Choisissez une formule adaptée à vos besoins de suivi de promotions.
          </p>
        </div>

        {message && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
            {message}
          </div>
        )}

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-slate-400">Abonnement actuel</p>

          {subscription ? (
            <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  {subscription.plans?.name || "Plan non renseigné"}
                </h2>
                <p className="mt-2 text-slate-300">
                  Statut :{" "}
                  <span className="font-semibold text-emerald-300">
                    {subscription.status || "Non renseigné"}
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Expire le : {formatDate(subscription.expires_at)}
                </p>
              </div>

              <span className="rounded-full bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-300">
                Actif
              </span>
            </div>
          ) : (
            <p className="mt-4 text-slate-300">
              Aucun abonnement actif pour le moment.
            </p>
          )}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
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
                    <h2 className="text-2xl font-bold">{plan.name}</h2>
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
                  Facturation : {plan.billing_period || "yearly"}
                </p>

                <ul className="mt-8 space-y-4 text-slate-300">
                  <li>✓ {plan.max_stores || 0} magasins suivis</li>
                  <li>✓ {plan.max_categories || 0} catégories suivies</li>
                  <li>
                    ✓ Alertes : {formatFrequency(plan.notification_frequency)}
                  </li>
                </ul>

                <button
                  onClick={() => choosePlan(plan.id)}
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
      </div>
    </main>
  );
}