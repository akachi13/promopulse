"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

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
  is_active: boolean | null;
};

type StatusFilter = "all" | "active" | "inactive";

function formatPrice(price: number | null) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(price || 0);
}

function getBillingLabel(value: string | null) {
  if (value === "monthly") return "Mensuelle";
  if (value === "yearly") return "Annuelle";
  if (value === "weekly") return "Hebdomadaire";
  return "Non définie";
}

function getFrequencyLabel(value: string | null) {
  if (value === "weekly") return "Hebdomadaire";
  if (value === "daily") return "Quotidienne";
  if (value === "instant") return "Instantanée";
  return "Non définie";
}

function getStatusClass(isActive: boolean | null) {
  if (isActive) {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }

  return "border-red-400/25 bg-red-400/10 text-red-300";
}

function getStatusLabel(isActive: boolean | null) {
  return isActive ? "Actif" : "Inactif";
}

function getPlanIcon(slug: string) {
  const value = slug.toLowerCase();

  if (value.includes("free") || value.includes("gratuit")) return "🌱";
  if (value.includes("pro")) return "🚀";
  if (value.includes("premium")) return "💎";
  if (value.includes("business")) return "🏢";
  if (value.includes("enterprise")) return "👑";

  return "📦";
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  async function loadPlans() {
    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("plans")
      .select(
        "id, name, slug, description, price, billing_period, max_stores, max_categories, notification_frequency, is_active"
      )
      .order("price", { ascending: true });

    if (error) {
      setMessage(`Erreur lors du chargement des plans : ${error.message}`);
      setIsLoading(false);
      return;
    }

    setPlans((data || []) as Plan[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadPlans();
  }, []);

  function updatePlanField(
    planId: string,
    field: keyof Plan,
    value: string | number | boolean
  ) {
    setPlans((current) =>
      current.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              [field]: value,
            }
          : plan
      )
    );
  }

  async function savePlan(plan: Plan) {
    setMessage("");
    setSavingPlanId(plan.id);

    const { error } = await supabase
      .from("plans")
      .update({
        description: plan.description,
        price: Number(plan.price || 0),
        billing_period: plan.billing_period,
        max_stores: Number(plan.max_stores || 0),
        max_categories: Number(plan.max_categories || 0),
        notification_frequency: plan.notification_frequency,
        is_active: plan.is_active,
      })
      .eq("id", plan.id);

    setSavingPlanId(null);

    if (error) {
      setMessage(`Erreur lors de la sauvegarde : ${error.message}`);
      return;
    }

    setMessage(`Le plan ${plan.name} a été mis à jour avec succès.`);
  }

  const stats = useMemo(() => {
    return {
      all: plans.length,
      active: plans.filter((plan) => plan.is_active).length,
      inactive: plans.filter((plan) => !plan.is_active).length,
      free: plans.filter((plan) => Number(plan.price || 0) === 0).length,
      paid: plans.filter((plan) => Number(plan.price || 0) > 0).length,
    };
  }, [plans]);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const normalizedSearch = search.toLowerCase().trim();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        plan.name.toLowerCase().includes(normalizedSearch) ||
        plan.slug.toLowerCase().includes(normalizedSearch) ||
        (plan.description || "").toLowerCase().includes(normalizedSearch) ||
        (plan.billing_period || "").toLowerCase().includes(normalizedSearch) ||
        (plan.notification_frequency || "")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && plan.is_active) ||
        (statusFilter === "inactive" && !plan.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [plans, search, statusFilter]);

  const highlightedPlan =
    plans.find((plan) => Number(plan.price || 0) > 0 && plan.is_active) ||
    plans[0] ||
    null;

  const filters = [
    {
      key: "all",
      label: "Tous",
      count: stats.all,
      icon: "📦",
    },
    {
      key: "active",
      label: "Actifs",
      count: stats.active,
      icon: "✅",
    },
    {
      key: "inactive",
      label: "Inactifs",
      count: stats.inactive,
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
            <p className="mt-5 text-slate-300">Chargement des plans...</p>
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
                onClick={loadPlans}
                disabled={isLoading}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Actualisation..." : "Actualiser"}
              </button>

              <a
                href="/admin/subscriptions"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                💳 Abonnements
              </a>

              <a
                href="/subscription"
                className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
              >
                Voir côté client
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
                  Gestion des forfaits
                </span>

                <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Configurez les{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                    plans
                  </span>{" "}
                  PromoPulse.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Ajustez les prix, périodes de facturation, limites de magasins,
                  limites de catégories et fréquences d’alertes des formules
                  disponibles sur la plateforme.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Total plans</p>
                    <p className="mt-2 text-4xl font-black">{stats.all}</p>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <p className="text-sm text-emerald-200">Actifs</p>
                    <p className="mt-2 text-4xl font-black text-emerald-300">
                      {stats.active}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-cyan-400/25 bg-cyan-400/10 p-5">
                    <p className="text-sm text-cyan-200">Payants</p>
                    <p className="mt-2 text-4xl font-black text-cyan-300">
                      {stats.paid}
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
                    Plan mis en avant
                  </p>

                  {highlightedPlan ? (
                    <>
                      <div className="mt-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-emerald-400 to-teal-300 text-4xl shadow-lg shadow-emerald-500/20">
                        {getPlanIcon(highlightedPlan.slug)}
                      </div>

                      <h2 className="mt-5 text-3xl font-black">
                        {highlightedPlan.name}
                      </h2>

                      <p className="mt-3 text-sm font-semibold text-emerald-100">
                        /{highlightedPlan.slug}
                      </p>

                      <p className="mt-5 text-4xl font-black text-white">
                        {formatPrice(highlightedPlan.price)}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-4 py-2 text-sm font-bold ${getStatusClass(
                            highlightedPlan.is_active
                          )}`}
                        >
                          {getStatusLabel(highlightedPlan.is_active)}
                        </span>

                        <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                          {getBillingLabel(highlightedPlan.billing_period)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-4 text-3xl font-black">
                        Aucun plan enregistré
                      </h2>

                      <p className="mt-4 leading-7 text-emerald-100">
                        Créez ou configurez les forfaits pour activer la gestion
                        commerciale de PromoPulse.
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                  <p className="text-sm font-bold text-white">
                    Impact direct
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    Ces paramètres pilotent les choix d’abonnement côté client et
                    les limites appliquées aux utilisateurs.
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
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

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-slate-500">Plans gratuits</p>
              <p className="mt-2 text-3xl font-black">{stats.free}</p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-slate-500">Plans payants</p>
              <p className="mt-2 text-3xl font-black">{stats.paid}</p>
            </div>
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
                  placeholder="Rechercher par nom, slug, description, période ou fréquence..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-12 py-4 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-sm font-semibold text-slate-300">
                {filteredPlans.length} résultat(s)
              </div>
            </div>
          </section>

          {filteredPlans.length === 0 && (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-3xl">
                🧭
              </div>

              <h2 className="mt-6 text-2xl font-black">Aucun plan trouvé</h2>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
                Essayez un autre filtre ou modifiez votre recherche.
              </p>
            </section>
          )}

          {filteredPlans.length > 0 && (
            <section className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {filteredPlans.map((plan) => {
                const isSaving = savingPlanId === plan.id;

                return (
                  <article
                    key={plan.id}
                    className={`group overflow-hidden rounded-[2rem] border p-6 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/30 ${
                      plan.is_active
                        ? "border-white/10 bg-white/[0.04] hover:border-emerald-400/30 hover:bg-white/[0.07]"
                        : "border-red-400/30 bg-red-400/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-300 text-3xl shadow-lg shadow-emerald-500/20">
                          {getPlanIcon(plan.slug)}
                        </div>

                        <div>
                          <h2 className="text-2xl font-black">{plan.name}</h2>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            /{plan.slug}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updatePlanField(
                            plan.id,
                            "is_active",
                            !plan.is_active
                          )
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                          plan.is_active
                        )}`}
                      >
                        {getStatusLabel(plan.is_active)}
                      </button>
                    </div>

                    <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                      <p className="text-sm text-emerald-100">Prix</p>
                      <p className="mt-1 text-4xl font-black text-emerald-300">
                        {formatPrice(plan.price)}
                      </p>
                      <p className="mt-1 text-sm text-emerald-100">
                        Facturation {getBillingLabel(plan.billing_period)}
                      </p>
                    </div>

                    <div className="mt-6 space-y-5">
                      <div>
                        <label className="text-sm font-semibold text-slate-300">
                          Description
                        </label>

                        <textarea
                          value={plan.description || ""}
                          onChange={(event) =>
                            updatePlanField(
                              plan.id,
                              "description",
                              event.target.value
                            )
                          }
                          rows={4}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-slate-300">
                          Prix
                        </label>

                        <input
                          type="number"
                          value={plan.price || 0}
                          onChange={(event) =>
                            updatePlanField(
                              plan.id,
                              "price",
                              Number(event.target.value)
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-slate-300">
                          Période de facturation
                        </label>

                        <select
                          value={plan.billing_period || "yearly"}
                          onChange={(event) =>
                            updatePlanField(
                              plan.id,
                              "billing_period",
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                        >
                          <option value="monthly">Mensuelle</option>
                          <option value="yearly">Annuelle</option>
                          <option value="weekly">Hebdomadaire</option>
                        </select>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-semibold text-slate-300">
                            Magasins max
                          </label>

                          <input
                            type="number"
                            value={plan.max_stores || 0}
                            onChange={(event) =>
                              updatePlanField(
                                plan.id,
                                "max_stores",
                                Number(event.target.value)
                              )
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-slate-300">
                            Catégories max
                          </label>

                          <input
                            type="number"
                            value={plan.max_categories || 0}
                            onChange={(event) =>
                              updatePlanField(
                                plan.id,
                                "max_categories",
                                Number(event.target.value)
                              )
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-slate-300">
                          Fréquence des alertes
                        </label>

                        <select
                          value={plan.notification_frequency || "weekly"}
                          onChange={(event) =>
                            updatePlanField(
                              plan.id,
                              "notification_frequency",
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                        >
                          <option value="weekly">Hebdomadaire</option>
                          <option value="daily">Quotidienne</option>
                          <option value="instant">Instantanée</option>
                        </select>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                          <p className="text-xs text-slate-500">Période</p>
                          <p className="mt-1 font-bold text-slate-200">
                            {getBillingLabel(plan.billing_period)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                          <p className="text-xs text-slate-500">Alertes</p>
                          <p className="mt-1 font-bold text-slate-200">
                            {getFrequencyLabel(plan.notification_frequency)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                          <p className="text-xs text-slate-500">Limites</p>
                          <p className="mt-1 font-bold text-slate-200">
                            {plan.max_stores || 0}/{plan.max_categories || 0}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => savePlan(plan)}
                        disabled={isSaving}
                        className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-300 px-6 py-4 font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? "Sauvegarde..." : "Sauvegarder le plan"}
                      </button>
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