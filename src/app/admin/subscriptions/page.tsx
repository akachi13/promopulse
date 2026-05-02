"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

type Plan = {
  id: string;
  name: string;
  slug: string;
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

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    setMessage("");

    const { data: plansData, error: plansError } = await supabase
      .from("plans")
      .select("id, name, slug")
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
          plans(name, slug)
        `
        )
        .order("created_at", { ascending: false });

    if (subscriptionsError) {
      setMessage(
        `Erreur abonnements : ${subscriptionsError.message}`
      );
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

  async function updateSubscription(
    subscriptionId: string,
    values: {
      status?: string;
      plan_id?: string;
    }
  ) {
    setMessage("");
    setUpdatingId(subscriptionId);

    const { error } = await supabase
      .from("subscriptions")
      .update({
        ...values,
        renewed_at: new Date().toISOString(),
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

  return (
    <AdminGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <a href="/admin" className="text-sm text-emerald-300">
            ← Retour à l’administration
          </a>

          <div className="mt-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold">
                Gestion des abonnements
              </h1>
              <p className="mt-2 text-slate-300">
                Consultez les abonnements, les formules choisies et les statuts.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-slate-400">Abonnements</p>
              <p className="mt-1 text-3xl font-bold">
                {subscriptions.length}
              </p>
            </div>
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

          {!isLoading && subscriptions.length === 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Aucun abonnement enregistré pour le moment.
            </div>
          )}

          {!isLoading && subscriptions.length > 0 && (
            <div className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
              <div className="hidden grid-cols-7 gap-4 border-b border-white/10 px-6 py-4 text-sm font-semibold text-slate-300 md:grid">
                <span>Utilisateur</span>
                <span>Email</span>
                <span>WhatsApp</span>
                <span>Formule</span>
                <span>Statut</span>
                <span>Expiration</span>
                <span>Création</span>
              </div>

              <div className="divide-y divide-white/10">
                {subscriptions.map((subscription) => {
                  const profile = profilesById[subscription.user_id];
                  const isUpdating = updatingId === subscription.id;

                  return (
                    <div
                      key={subscription.id}
                      className="grid gap-4 px-6 py-5 text-sm md:grid-cols-7 md:items-center"
                    >
                      <div>
                        <p className="font-semibold text-white">
                          {profile?.full_name || "Nom non renseigné"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          ID : {subscription.user_id.slice(0, 8)}...
                        </p>
                      </div>

                      <p className="break-all text-slate-300">
                        {profile?.email || "Non renseigné"}
                      </p>

                      <p className="text-slate-300">
                        {profile?.whatsapp_number || "Non renseigné"}
                      </p>

                      <select
                        value={subscription.plan_id || ""}
                        disabled={isUpdating}
                        onChange={(e) =>
                          updateSubscription(subscription.id, {
                            plan_id: e.target.value,
                          })
                        }
                        className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-400 disabled:opacity-60"
                      >
                        <option value="">Aucun plan</option>
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={subscription.status || "trial"}
                        disabled={isUpdating}
                        onChange={(e) =>
                          updateSubscription(subscription.id, {
                            status: e.target.value,
                          })
                        }
                        className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-400 disabled:opacity-60"
                      >
                        <option value="trial">trial</option>
                        <option value="active">active</option>
                        <option value="expired">expired</option>
                        <option value="suspended">suspended</option>
                        <option value="cancelled">cancelled</option>
                      </select>

                      <p className="text-slate-300">
                        {formatDate(subscription.expires_at)}
                      </p>

                      <p className="text-slate-400">
                        {formatDate(subscription.created_at)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}