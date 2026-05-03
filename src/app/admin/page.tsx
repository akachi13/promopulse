"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import AdminGuard from "../../components/AdminGuard";

type AdminStats = {
  users: number;
  stores: number;
  categories: number;
  draftDeals: number;
  publishedDeals: number;
  activeSubscriptions: number;
  notifications: number;
};

const adminCards = [
  {
    title: "Utilisateurs",
    description: "Consulter et gérer les comptes utilisateurs.",
    href: "/admin/users",
  },
  {
    title: "Magasins",
    description: "Gérer les enseignes suivies sur PromoPulse.",
    href: "/admin/stores",
  },
  {
    title: "Catégories",
    description: "Organiser les promotions par catégories.",
    href: "/admin/categories",
  },
  {
    title: "Promotions",
    description: "Ajouter, publier, modifier ou supprimer les offres.",
    href: "/admin/deals",
  },
  {
    title: "Import promos",
    description:
      "Scanner les liens web, Facebook ou TikTok des magasins avec Gemini.",
    href: "/admin/import-promotions",
  },
  {
    title: "Abonnements",
    description: "Suivre les plans, paiements et statuts d’abonnement.",
    href: "/admin/subscriptions",
  },
  {
    title: "Plans",
    description: "Modifier les prix, limites et fréquences des formules.",
    href: "/admin/plans",
  },
  {
    title: "Notifications",
    description:
      "Simuler et suivre les alertes WhatsApp envoyées aux utilisateurs.",
    href: "/admin/notifications",
  },
  {
  title: "Historique alertes",
  description:
    "Consulter toutes les notifications WhatsApp simulées ou envoyées.",
  href: "/admin/notification-logs",
  },
];

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats>({
    users: 0,
    stores: 0,
    categories: 0,
    draftDeals: 0,
    publishedDeals: 0,
    activeSubscriptions: 0,
    notifications: 0,
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadStats() {
    setIsLoading(true);
    setMessage("");

    const [
      usersResult,
      storesResult,
      categoriesResult,
      draftDealsResult,
      publishedDealsResult,
      activeSubscriptionsResult,
      notificationsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),

      supabase.from("stores").select("*", { count: "exact", head: true }),

      supabase.from("categories").select("*", {
        count: "exact",
        head: true,
      }),

      supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .eq("status", "draft"),

      supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),

      supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),

      supabase
        .from("notification_logs")
        .select("*", { count: "exact", head: true }),
    ]);

    const firstError =
      usersResult.error ||
      storesResult.error ||
      categoriesResult.error ||
      draftDealsResult.error ||
      publishedDealsResult.error ||
      activeSubscriptionsResult.error ||
      notificationsResult.error;

    if (firstError) {
      setMessage(`Erreur lors du chargement des statistiques : ${firstError.message}`);
      setIsLoading(false);
      return;
    }

    setStats({
      users: usersResult.count || 0,
      stores: storesResult.count || 0,
      categories: categoriesResult.count || 0,
      draftDeals: draftDealsResult.count || 0,
      publishedDeals: publishedDealsResult.count || 0,
      activeSubscriptions: activeSubscriptionsResult.count || 0,
      notifications: notificationsResult.count || 0,
    });

    setIsLoading(false);
  }

  useEffect(() => {
    loadStats();
  }, []);

  const statCards = [
    {
      label: "Utilisateurs",
      value: stats.users,
      href: "/admin/users",
    },
    {
      label: "Magasins",
      value: stats.stores,
      href: "/admin/stores",
    },
    {
      label: "Catégories",
      value: stats.categories,
      href: "/admin/categories",
    },
    {
      label: "Brouillons",
      value: stats.draftDeals,
      href: "/admin/deals",
    },
    {
      label: "Promos publiées",
      value: stats.publishedDeals,
      href: "/admin/deals",
    },
    {
      label: "Abonnements actifs",
      value: stats.activeSubscriptions,
      href: "/admin/subscriptions",
    },
    {
      label: "Alertes",
      value: stats.notifications,
      href: "/admin/notifications",
    },
  ];

  return (
    <AdminGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <a href="/" className="text-xl font-bold">
                Promo<span className="text-emerald-400">Pulse</span>
              </a>

              <h1 className="mt-8 text-4xl font-bold">
                Tableau de bord admin
              </h1>

              <p className="mt-2 max-w-3xl text-slate-300">
                Pilotez les utilisateurs, les magasins, les catégories, les
                promotions, les abonnements et les alertes PromoPulse.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={loadStats}
                disabled={isLoading}
                className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
              >
                {isLoading ? "Actualisation..." : "Actualiser"}
              </button>

              <a
                href="/admin/import-promotions"
                className="rounded-full border border-emerald-400/40 px-6 py-3 text-center font-semibold text-emerald-300 transition hover:bg-emerald-400/10"
              >
                Importer des promos
              </a>

              <a
                href="/admin/deals/new"
                className="rounded-full bg-emerald-400 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Ajouter une promotion
              </a>
            </div>
          </div>

          {message && (
            <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
              {message}
            </div>
          )}

          <section className="mt-10">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-bold">Statistiques rapides</h2>
                <p className="mt-2 text-slate-300">
                  Vue globale de l’activité actuelle de la plateforme.
                </p>
              </div>

              {isLoading && (
                <p className="text-sm text-slate-400">
                  Chargement des statistiques...
                </p>
              )}
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <a
                  key={stat.label}
                  href={stat.href}
                  className="rounded-[2rem] border border-white/10 bg-white/5 p-6 transition hover:border-emerald-400/40 hover:bg-white/10"
                >
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="mt-4 text-4xl font-bold">{stat.value}</p>
                </a>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold">Modules d’administration</h2>
            <p className="mt-2 text-slate-300">
              Accédez rapidement aux différentes fonctions du back-office.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {adminCards.map((card) => (
                <a
                  key={card.title}
                  href={card.href}
                  className="rounded-[2rem] border border-white/10 bg-white/5 p-6 transition hover:border-emerald-400/40 hover:bg-white/10"
                >
                  <div className="h-12 w-12 rounded-2xl bg-emerald-400/20" />

                  <h3 className="mt-5 text-xl font-semibold">{card.title}</h3>

                  <p className="mt-2 leading-7 text-slate-300">
                    {card.description}
                  </p>

                  <span className="mt-6 inline-flex text-sm font-semibold text-emerald-300">
                    Ouvrir →
                  </span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}