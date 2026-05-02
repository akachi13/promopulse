"use client";

import { useEffect, useState } from "react";
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

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);

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

  return (
    <AdminGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <a href="/admin" className="text-sm text-emerald-300">
            ← Retour à l’administration
          </a>

          <div className="mt-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold">Gestion des plans</h1>
              <p className="mt-2 text-slate-300">
                Modifiez les limites, prix et fréquences des formules
                PromoPulse.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-slate-400">Plans disponibles</p>
              <p className="mt-1 text-3xl font-bold">{plans.length}</p>
            </div>
          </div>

          {isLoading && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Chargement des plans...
            </div>
          )}

          {message && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
              {message}
            </div>
          )}

          {!isLoading && plans.length === 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Aucun plan enregistré pour le moment.
            </div>
          )}

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => {
              const isSaving = savingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`rounded-[2rem] border p-6 ${
                    plan.is_active
                      ? "border-white/10 bg-white/5"
                      : "border-red-400/30 bg-red-400/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">{plan.name}</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {plan.slug}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        updatePlanField(plan.id, "is_active", !plan.is_active)
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        plan.is_active
                          ? "bg-emerald-400 text-slate-950"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {plan.is_active ? "Actif" : "Inactif"}
                    </button>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <label className="text-sm text-slate-300">
                        Description
                      </label>
                      <textarea
                        value={plan.description || ""}
                        onChange={(e) =>
                          updatePlanField(
                            plan.id,
                            "description",
                            e.target.value
                          )
                        }
                        rows={3}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-slate-300">
                        Prix annuel
                      </label>
                      <input
                        type="number"
                        value={plan.price || 0}
                        onChange={(e) =>
                          updatePlanField(
                            plan.id,
                            "price",
                            Number(e.target.value)
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-slate-300">
                        Période de facturation
                      </label>
                      <select
                        value={plan.billing_period || "yearly"}
                        onChange={(e) =>
                          updatePlanField(
                            plan.id,
                            "billing_period",
                            e.target.value
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                      >
                        <option value="monthly">Mensuelle</option>
                        <option value="yearly">Annuelle</option>
                      </select>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="text-sm text-slate-300">
                          Magasins max
                        </label>
                        <input
                          type="number"
                          value={plan.max_stores || 0}
                          onChange={(e) =>
                            updatePlanField(
                              plan.id,
                              "max_stores",
                              Number(e.target.value)
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                        />
                      </div>

                      <div>
                        <label className="text-sm text-slate-300">
                          Catégories max
                        </label>
                        <input
                          type="number"
                          value={plan.max_categories || 0}
                          onChange={(e) =>
                            updatePlanField(
                              plan.id,
                              "max_categories",
                              Number(e.target.value)
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-slate-300">
                        Fréquence des alertes
                      </label>
                      <select
                        value={plan.notification_frequency || "weekly"}
                        onChange={(e) =>
                          updatePlanField(
                            plan.id,
                            "notification_frequency",
                            e.target.value
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                      >
                        <option value="weekly">Hebdomadaire</option>
                        <option value="daily">Quotidienne</option>
                        <option value="instant">Instantanée</option>
                      </select>
                    </div>

                    <button
                      onClick={() => savePlan(plan)}
                      disabled={isSaving}
                      className="w-full rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                    >
                      {isSaving ? "Sauvegarde..." : "Sauvegarder"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}