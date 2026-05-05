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

type StatusFilter =
  | "all"
  | "active"
  | "expired"
  | "cancelled"
  | "suspended"
  | "pending"
  | "trial";

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

  const expiryDate = new Date(date);
  expiryDate.setHours(0, 0, 0, 0);

  const diff = expiryDate.getTime() - today.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
    return "border-red-400/25 bg-red-400/10 text-red-300";
  }

  if (status === "active") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "trial" || status === "pending") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }

  if (status === "cancelled" || status === "suspended") {
    return "border-slate-400/25 bg-slate-400/10 text-slate-300";
  }

  return "border-white/10 bg-white/[0.04] text-slate-300";
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

function formatBillingPeriod(value: string | null) {
  if (value === "monthly") return "Mensuel";
  if (value === "yearly") return "Annuel";
  if (value === "weekly") return "Hebdomadaire";
  return value || "Non défini";
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

    const loadedSubscriptions = (subscriptionsData ||
      []) as unknown as Subscription[];

    const userIds = Array.from(
      new Set(loadedSubscriptions.map((item) => item.user_id))
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
    setSubscriptions(loadedSubscriptions);
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
      suspended: subscriptions.filter(
        (subscription) => subscription.status === "suspended"
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
        (subscription.plans?.slug || "")
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
    const plan = plans.find((item) => item.id === subscription.plan_id) || null;

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

  const latestSubscription = subscriptions[0] || null;

  const filters = [
    {
      key: "all",
      label: "Tous",
      count: stats.all,
      icon: "💳",
    },
    {
      key: "active",
      label: "Actifs",
      count: stats.active,
      icon: "✅",
    },
    {
      key: "expired",
      label: "Expirés",
      count: stats.expired,
      icon: "⏳",
    },
    {
      key: "cancelled",
      label: "Annulés",
      count: stats.cancelled,
      icon: "🚫",
    },
    {
      key: "pending",
      label: "En attente",
      count: stats.pending,
      icon: "🕓",
    },
    {
      key: "suspended",
      label: "Suspendus",
      count: stats.suspended,
      icon: "⛔",
    },
  ] as const;

  if (isLoading) {
    return (
      <AdminGuard>
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6 text-white">
          <div className="pointer-events-none fixed inset-0">
            <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[130px]" />
            <div className="absolute bottom-[-12rem] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-emerald-700/15 blur-[120px]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
          </div>

          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 text-center shadow-2xl backdrop-blur-2xl">
            <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-emerald-400/30" />
            <p className="mt-5 text-slate-300">
              Chargement des abonnements...
            </p>
          </div>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
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
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
            >
              ← Retour à l’administration
            </a>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Actualisation..." : "Actualiser"}
              </button>

              <a
                href="/admin/users"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                👥 Utilisateurs
              </a>

              <a
                href="/admin/plans"
                className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
              >
                📦 Plans
              </a>
            </div>
          </header>

          {message && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-slate-200 backdrop-blur-xl">
              {message}
            </div>
          )}

          <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-2xl backdrop-blur-2xl md:p-9">
              <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,.8)]" />
                  Gestion des abonnements
                </span>

                <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Supervisez les{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                    forfaits
                  </span>{" "}
                  utilisateurs.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Consultez les abonnements PromoPulse, changez les formules,
                  renouvelez, annulez ou suspendez les accès utilisateurs.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Total abonnements</p>
                    <p className="mt-2 text-4xl font-black">{stats.all}</p>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <p className="text-sm text-emerald-200">Actifs</p>
                    <p className="mt-2 text-4xl font-black text-emerald-300">
                      {stats.active}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5">
                    <p className="text-sm text-red-200">Expirés</p>
                    <p className="mt-2 text-4xl font-black text-red-300">
                      {stats.expired}
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
                    Dernier abonnement
                  </p>

                  {latestSubscription ? (
                    <>
                      <h2 className="mt-4 text-3xl font-black">
                        {profilesById[latestSubscription.user_id]?.full_name ||
                          profilesById[latestSubscription.user_id]?.email ||
                          "Utilisateur"}
                      </h2>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-4 py-2 text-sm font-bold ${getStatusClass(
                            latestSubscription.status,
                            latestSubscription.expires_at
                          )}`}
                        >
                          {getStatusLabel(
                            latestSubscription.status,
                            latestSubscription.expires_at
                          )}
                        </span>

                        <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                          {latestSubscription.plans?.name || "Plan inconnu"}
                        </span>
                      </div>

                      <p className="mt-5 text-sm leading-6 text-emerald-100">
                        Expiration :{" "}
                        <span className="font-bold text-white">
                          {formatDate(latestSubscription.expires_at)}
                        </span>
                      </p>

                      <p className="mt-2 text-sm leading-6 text-emerald-100">
                        Limites :{" "}
                        <span className="font-bold text-white">
                          {formatPlanLimits(latestSubscription.plans)}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-4 text-3xl font-black">
                        Aucun abonnement
                      </h2>

                      <p className="mt-4 leading-7 text-emerald-100">
                        Les abonnements utilisateurs apparaîtront ici dès qu’ils
                        choisiront une formule.
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                  <p className="text-sm font-bold text-white">Important</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    Cette page ne déclenche pas encore de paiement réel. Elle
                    permet de gérer les statuts et les plans côté back-office.
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {filters.map((item) => {
              const isActive = statusFilter === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key)}
                  className={`group rounded-[1.75rem] border p-5 text-left backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/30 ${
                    isActive
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/10 bg-white/[0.04] hover:border-emerald-400/30 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-xl">
                      {item.icon}
                    </div>

                    <span className="text-slate-600 transition group-hover:text-emerald-300">
                      →
                    </span>
                  </div>

                  <p className="mt-5 text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-4xl font-black">{item.count}</p>
                </button>
              );
            })}
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
                  placeholder="Rechercher par utilisateur, email, WhatsApp, formule ou statut..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-12 py-4 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-sm font-semibold text-slate-300">
                {filteredSubscriptions.length} résultat(s)
              </div>
            </div>
          </section>

          {filteredSubscriptions.length === 0 && (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-3xl">
                🧭
              </div>

              <h2 className="mt-6 text-2xl font-black">
                Aucun abonnement trouvé
              </h2>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
                Essayez un autre filtre ou modifiez votre recherche.
              </p>
            </section>
          )}

          {filteredSubscriptions.length > 0 && (
            <section className="mt-10 grid gap-6">
              {filteredSubscriptions.map((subscription) => {
                const profile = profilesById[subscription.user_id];
                const isUpdating = updatingId === subscription.id;
                const effectiveStatus = getEffectiveStatus(subscription);
                const daysLeft = getDaysUntil(subscription.expires_at);

                return (
                  <article
                    key={subscription.id}
                    className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-emerald-950/30"
                  >
                    <div className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">
                      <div>
                        <div className="flex flex-col gap-5 md:flex-row md:items-start">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-300 text-2xl font-black text-slate-950 shadow-lg shadow-emerald-500/20">
                            {(profile?.full_name || profile?.email || "U")
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>

                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <h2 className="text-2xl font-black">
                                {profile?.full_name ||
                                  profile?.email ||
                                  "Utilisateur non renseigné"}
                              </h2>

                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                                  subscription.status,
                                  subscription.expires_at
                                )}`}
                              >
                                {getStatusLabel(
                                  subscription.status,
                                  subscription.expires_at
                                )}
                              </span>

                              <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                                {subscription.plans?.name || "Aucun plan"}
                              </span>

                              {effectiveStatus === "expired" && (
                                <span className="rounded-full border border-red-400/25 bg-red-400/10 px-3 py-1 text-xs font-bold text-red-300">
                                  À renouveler
                                </span>
                              )}
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                                <p className="text-xs text-slate-500">Email</p>
                                <p className="mt-1 truncate font-bold text-slate-200">
                                  {profile?.email || "Non renseigné"}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                                <p className="text-xs text-slate-500">
                                  WhatsApp
                                </p>
                                <p className="mt-1 truncate font-bold text-slate-200">
                                  {profile?.whatsapp_number || "Non renseigné"}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                                <p className="text-xs text-slate-500">Début</p>
                                <p className="mt-1 font-bold text-slate-200">
                                  {formatDate(subscription.started_at)}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                                <p className="text-xs text-slate-500">
                                  Expiration
                                </p>
                                <p className="mt-1 font-bold text-slate-200">
                                  {formatDate(subscription.expires_at)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-3">
                              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                                <p className="text-xs text-slate-500">
                                  Facturation
                                </p>
                                <p className="mt-1 font-bold text-slate-200">
                                  {formatBillingPeriod(
                                    subscription.plans?.billing_period || null
                                  )}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                                <p className="text-xs text-slate-500">
                                  Limites
                                </p>
                                <p className="mt-1 font-bold text-slate-200">
                                  {formatPlanLimits(subscription.plans)}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                                <p className="text-xs text-slate-500">
                                  Jours restants
                                </p>
                                <p className="mt-1 font-bold text-slate-200">
                                  {daysLeft === null
                                    ? "Non renseigné"
                                    : daysLeft < 0
                                    ? "Expiré"
                                    : `${daysLeft} jour(s)`}
                                </p>
                              </div>
                            </div>

                            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                              <p className="text-xs text-slate-500">
                                Changer de formule
                              </p>

                              <select
                                value={subscription.plan_id || ""}
                                disabled={isUpdating}
                                onChange={(event) =>
                                  changePlan(subscription, event.target.value)
                                }
                                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-emerald-400 disabled:opacity-60"
                              >
                                <option value="">Aucun plan</option>

                                {plans.map((plan) => (
                                  <option key={plan.id} value={plan.id}>
                                    {plan.name} — {formatPlanLimits(plan)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <aside className="rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                          Actions
                        </p>

                        <div className="mt-5 space-y-3">
                          <button
                            onClick={() => renewSubscription(subscription)}
                            disabled={isUpdating}
                            className="w-full rounded-2xl bg-emerald-400 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
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
                              className="w-full rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 font-bold text-emerald-300 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                              className="w-full rounded-2xl border border-red-400/40 bg-red-400/10 px-5 py-3 font-bold text-red-300 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                              className="w-full rounded-2xl border border-slate-400/40 bg-white/[0.04] px-5 py-3 font-bold text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Suspendre
                            </button>
                          )}

                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                            <p className="text-xs text-slate-500">Création</p>
                            <p className="mt-1 font-bold text-slate-200">
                              {formatDate(subscription.created_at)}
                            </p>
                          </div>
                        </div>
                      </aside>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}