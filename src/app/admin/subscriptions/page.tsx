"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

type Plan = {
  id: string;
  name: string;
  slug: string;
  billing_period: string | null;
  max_stores: number | null;
  max_categories: number | null;
};

type Subscription = {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  plans: {
    name: string;
    slug: string;
    billing_period: string | null;
    max_stores: number | null;
    max_categories: number | null;
  } | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp_number: string | null;
};

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

function getEffectiveStatus(subscription: Subscription) {
  if (isExpired(subscription.expires_at)) return "expired";
  return subscription.status || "pending";
}

function getStatusLabel(status: string | null, expiresAt: string | null) {
  if (isExpired(expiresAt)) return "Expiré";
  if (status === "active") return "Actif";
  if (status === "expired") return "Expiré";
  if (status === "cancelled") return "Annulé";
  if (status === "suspended") return "Suspendu";
  if (status === "trial") return "Essai";
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

  if (status === "trial" || status === "pending") {
    return "bg-amber-400/20 text-amber-200";
  }

  if (status === "cancelled" || status === "suspended") {
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

function formatPlanLimits(plan: Plan | Subscription["plans"] | null) {
  if (!plan) return "Limites non renseignées";

  return `${plan.max_stores || 0} magasin(s) / ${
    plan.max_categories || 0
  } catégorie(s)`;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  async function loadData() {
    setIsLoading(true);
    setMessage("");

    const { data: plansData, error: plansError } = await supabase
      .from("plans")
      .select("id, name, slug, billing_period, max_stores, max_categories")
      .order("name", { ascending: true });

    if (plansError) {
      setMessage(`Erreur plans : ${plansError.message}`);
      setIsLoading(false);
      return;
    }

    const { data: subscriptionsData, error: subscriptionsError } =
      await supabase
        .from("subscriptions")
        .select(
          `
          id,
          user_id,
          plan_id,
          status,
          started_at,
          expires_at,
          created_at,
          plans(name, slug, billing_period, max_stores, max_categories)
        `
        )
        .order("created_at", { ascending: false });

    if (subscriptionsError) {
      setMessage(`Erreur abonnements : ${subscriptionsError.message}`);
      setIsLoading(false);
      return;
    }

    const userIds = Array.from(
      new Set((subscriptionsData || []).map((item) => item.user_id))
    );

    let profilesMap: Record<string, Profile> = {};

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, whatsapp_number")
        .in("id", userIds);

      if (profilesError) {
        setMessage(`Erreur utilisateurs : ${profilesError.message}`);
        setIsLoading(false);
        return;
      }

      profilesMap = ((profilesData || []) as Profile[]).reduce(
        (acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        },
        {} as Record<string, Profile>
      );
    }

    setPlans((plansData || []) as Plan[]);
    setSubscriptions((subscriptionsData || []) as unknown as Subscription[]);
    setProfilesById(profilesMap);
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    return {
      all: subscriptions.length,
      active: subscriptions.filter(
        (subscription) => getEffectiveStatus(subscription) === "active"
      ).length,
      expired: subscriptions.filter(
        (subscription) => getEffectiveStatus(subscription) === "expired"
      ).length,
      cancelled: subscriptions.filter(
        (subscription) => subscription.status === "cancelled"
      ).length,
      pending: subscriptions.filter((subscription) =>
        ["pending", "trial"].includes(subscription.status || "")
      ).length,
    };
  }, [subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((subscription) => {
      const effectiveStatus = getEffectiveStatus(subscription);

      const matchesStatus =
        statusFilter === "all" ||
        effectiveStatus === statusFilter ||
        subscription.status === statusFilter;

      const profile = profilesById[subscription.user_id];
      const normalizedSearch = search.toLowerCase().trim();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        (profile?.full_name || "").toLowerCase().includes(normalizedSearch) ||
        (profile?.email || "").toLowerCase().includes(normalizedSearch) ||
        (profile?.whatsapp_number || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (subscription.plans?.name || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (subscription.status || "").toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [subscriptions, profilesById, statusFilter, search]);

  async function updateSubscription(
    subscriptionId: string,
    values: {
      status?: string;
      plan_id?: string | null;
      expires_at?: string | null;
      started_at?: string | null;
    }
  ) {
    setMessage("");
    setUpdatingId(subscriptionId);

    const { error } = await supabase
      .from("subscriptions")
      .update({
        ...values,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId);

    setUpdatingId(null);

    if (error) {
      setMessage(`Erreur mise à jour : ${error.message}`);
      return;
    }

    setMessage("Abonnement mis à jour avec succès.");
    await loadData();
  }

  async function renewSubscription(subscription: Subscription) {
    const plan =
      plans.find((item) => item.id === subscription.plan_id) || null;

    const expiresAt = calculateExpiryDate(
      plan?.billing_period || subscription.plans?.billing_period || null
    );

    await updateSubscription(subscription.id, {
      status: "active",
      expires_at: expiresAt.toISOString(),
      started_at: subscription.started_at || new Date().toISOString(),
    });
  }

  async function changePlan(subscription: Subscription, planId: string) {
    const plan = plans.find((item) => item.id === planId);

    if (!plan) {
      await updateSubscription(subscription.id, {
        plan_id: planId || null,
      });
      return;
    }

    const expiresAt = calculateExpiryDate(plan.billing_period);

    await updateSubscription(subscription.id, {
      plan_id: plan.id,
      status: "active",
      expires_at: expiresAt.toISOString(),
      started_at: subscription.started_at || new Date().toISOString(),
    });
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
              <h1 className="text-4xl font-bold">Gestion des abonnements</h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                Consultez les abonnements, changez les formules, renouvelez,
                annulez ou réactivez les accès utilisateurs.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
              >
                {isLoading ? "Actualisation..." : "Actualiser"}
              </button>

              <a
                href="/admin/plans"
                className="rounded-full border border-emerald-400/40 px-6 py-3 text-center font-semibold text-emerald-300 transition hover:bg-emerald-400/10"
              >
                Gérer les plans
              </a>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-5">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "all"
                  ? "border-emerald-400 bg-emerald-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Tous</p>
              <p className="mt-1 text-3xl font-bold">{stats.all}</p>
            </button>

            <button
              onClick={() => setStatusFilter("active")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "active"
                  ? "border-emerald-400 bg-emerald-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Actifs</p>
              <p className="mt-1 text-3xl font-bold">{stats.active}</p>
            </button>

            <button
              onClick={() => setStatusFilter("expired")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "expired"
                  ? "border-red-400 bg-red-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Expirés</p>
              <p className="mt-1 text-3xl font-bold">{stats.expired}</p>
            </button>

            <button
              onClick={() => setStatusFilter("cancelled")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "cancelled"
                  ? "border-slate-400 bg-slate-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Annulés</p>
              <p className="mt-1 text-3xl font-bold">{stats.cancelled}</p>
            </button>

            <button
              onClick={() => setStatusFilter("pending")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "pending"
                  ? "border-amber-400 bg-amber-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">En attente / essai</p>
              <p className="mt-1 text-3xl font-bold">{stats.pending}</p>
            </button>
          </div>

          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par utilisateur, email, WhatsApp, formule ou statut..."
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            />
          </div>

          {isLoading && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Chargement des abonnements...
            </div>
          )}

          {message && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
              {message}
            </div>
          )}

          {!isLoading && filteredSubscriptions.length === 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Aucun abonnement ne correspond au filtre sélectionné.
            </div>
          )}

          {!isLoading && filteredSubscriptions.length > 0 && (
            <div className="mt-10 space-y-5">
              {filteredSubscriptions.map((subscription) => {
                const profile = profilesById[subscription.user_id];
                const isUpdating = updatingId === subscription.id;
                const effectiveStatus = getEffectiveStatus(subscription);

                return (
                  <div
                    key={subscription.id}
                    className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
                  >
                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusClass(
                              subscription.status,
                              subscription.expires_at
                            )}`}
                          >
                            {getStatusLabel(
                              subscription.status,
                              subscription.expires_at
                            )}
                          </span>

                          <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                            {subscription.plans?.name || "Aucun plan"}
                          </span>

                          {effectiveStatus === "expired" && (
                            <span className="rounded-full bg-red-400/20 px-3 py-1 text-sm text-red-300">
                              À renouveler
                            </span>
                          )}
                        </div>

                        <h2 className="mt-5 text-2xl font-bold">
                          {profile?.full_name ||
                            profile?.email ||
                            "Utilisateur non renseigné"}
                        </h2>

                        <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2 lg:grid-cols-4">
                          <p>
                            Email :{" "}
                            <span className="break-all text-white">
                              {profile?.email || "Non renseigné"}
                            </span>
                          </p>

                          <p>
                            WhatsApp :{" "}
                            <span className="text-white">
                              {profile?.whatsapp_number || "Non renseigné"}
                            </span>
                          </p>

                          <p>
                            Début :{" "}
                            <span className="text-white">
                              {formatDate(subscription.started_at)}
                            </span>
                          </p>

                          <p>
                            Expiration :{" "}
                            <span className="text-white">
                              {formatDate(subscription.expires_at)}
                            </span>
                          </p>
                        </div>

                        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5">
                          <p className="text-sm text-slate-400">
                            Formule et limites
                          </p>

                          <div className="mt-3 grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="text-xs text-slate-400">
                                Changer de formule
                              </label>

                              <select
                                value={subscription.plan_id || ""}
                                disabled={isUpdating}
                                onChange={(event) =>
                                  changePlan(subscription, event.target.value)
                                }
                                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 outline-none focus:border-emerald-400 disabled:opacity-60"
                              >
                                <option value="">Aucun plan</option>

                                {plans.map((plan) => (
                                  <option key={plan.id} value={plan.id}>
                                    {plan.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <p className="text-xs text-slate-400">
                                Limites du plan actuel
                              </p>

                              <p className="mt-3 font-semibold text-slate-200">
                                {formatPlanLimits(subscription.plans)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex min-w-56 flex-col gap-3">
                        <button
                          onClick={() => renewSubscription(subscription)}
                          disabled={isUpdating}
                          className="rounded-full bg-emerald-400 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                        >
                          {isUpdating ? "Mise à jour..." : "Renouveler"}
                        </button>

                        {subscription.status !== "active" && (
                          <button
                            onClick={() =>
                              updateSubscription(subscription.id, {
                                status: "active",
                                expires_at: calculateExpiryDate(
                                  subscription.plans?.billing_period || null
                                ).toISOString(),
                              })
                            }
                            disabled={isUpdating}
                            className="rounded-full border border-emerald-400/40 px-5 py-2.5 font-semibold text-emerald-300 transition hover:bg-emerald-400/10 disabled:opacity-60"
                          >
                            Réactiver
                          </button>
                        )}

                        {subscription.status !== "cancelled" && (
                          <button
                            onClick={() =>
                              updateSubscription(subscription.id, {
                                status: "cancelled",
                              })
                            }
                            disabled={isUpdating}
                            className="rounded-full border border-red-400/40 px-5 py-2.5 font-semibold text-red-300 transition hover:bg-red-400/10 disabled:opacity-60"
                          >
                            Annuler
                          </button>
                        )}

                        {subscription.status !== "suspended" && (
                          <button
                            onClick={() =>
                              updateSubscription(subscription.id, {
                                status: "suspended",
                              })
                            }
                            disabled={isUpdating}
                            className="rounded-full border border-slate-400/40 px-5 py-2.5 font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-60"
                          >
                            Suspendre
                          </button>
                        )}
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