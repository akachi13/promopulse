"use client";

import { useEffect, useState } from "react";
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
  discount_percentage: number | null;
  stores: {
    name: string;
  } | null;
};

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [storeCount, setStoreCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, whatsapp_number, city")
        .eq("id", user.id)
        .single();

      const { data: dealsData } = await supabase
        .from("deals")
        .select(
          `
          id,
          title,
          description,
          discount_percentage,
          stores(name)
        `
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(3);

      const { count: followedStoresCount } = await supabase
        .from("user_stores")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: followedCategoriesCount } = await supabase
        .from("user_categories")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: sentNotificationsCount } = await supabase
        .from("notification_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setProfile(profileData as Profile | null);
      setDeals((dealsData || []) as unknown as Deal[]);
      setStoreCount(followedStoresCount || 0);
      setCategoryCount(followedCategoriesCount || 0);
      setNotificationCount(sentNotificationsCount || 0);
      setIsLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-slate-300">Chargement du tableau de bord...</p>
        </div>
      </main>
    );
  }

  const stats = [
    { label: "Magasins suivis", value: storeCount.toString() },
    { label: "Catégories", value: categoryCount.toString() },
    { label: "Promotions actives", value: deals.length.toString() },
    { label: "Alertes envoyées", value: notificationCount.toString() },
  ];

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

            <p className="mt-2 text-slate-300">
              Retrouvez vos promotions personnalisées et vos alertes récentes.
            </p>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Compte connecté</p>
              <p className="mt-2 font-semibold">
                {profile?.email || "Email non renseigné"}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                WhatsApp : {profile?.whatsapp_number || "Non renseigné"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="/stores"
              className="rounded-full bg-emerald-400 px-6 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-300"
            >
              Gérer mes magasins
            </a>

            <a
              href="/categories"
              className="rounded-full bg-white px-6 py-3 text-center font-semibold text-slate-950 hover:bg-slate-200"
            >
              Gérer mes catégories
            </a>

            <a
              href="/settings/whatsapp"
              className="rounded-full border border-emerald-400/40 px-6 py-3 text-center font-semibold text-emerald-300 hover:bg-emerald-400/10"
            >
              Paramètres WhatsApp
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

            <button
              onClick={handleLogout}
              className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Déconnexion
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
            >
              <p className="text-sm text-slate-400">{stat.label}</p>
              <p className="mt-4 text-4xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="mt-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Promotions recommandées</h2>
              <p className="mt-2 text-slate-300">
                Voici les dernières promotions publiées sur PromoPulse.
              </p>
            </div>

            <a href="/deals" className="text-sm font-semibold text-emerald-300">
              Voir toutes les promotions →
            </a>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {deals.map((deal) => (
              <div
                key={deal.id}
                className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
              >
                <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-sm text-emerald-300">
                  -{deal.discount_percentage || 0}%
                </span>

                <h3 className="mt-5 text-xl font-semibold">{deal.title}</h3>

                <p className="mt-2 text-slate-300">
                  {deal.stores?.name || "Magasin non renseigné"}
                </p>

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">
                  {deal.description || "Aucune description disponible."}
                </p>

                <a
                  href="/deals"
                  className="mt-6 inline-flex font-semibold text-emerald-300"
                >
                  Voir l’offre →
                </a>
              </div>
            ))}
          </div>

          {deals.length === 0 && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Aucune promotion publiée pour le moment.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}