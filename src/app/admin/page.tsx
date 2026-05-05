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
    icon: "👥",
    badge: "Comptes",
  },
  {
    title: "Magasins",
    description: "Gérer les enseignes suivies sur PromoPulse.",
    href: "/admin/stores",
    icon: "🏬",
    badge: "Sources",
  },
  {
    title: "Catégories",
    description: "Organiser les promotions par catégories.",
    href: "/admin/categories",
    icon: "🏷️",
    badge: "Classement",
  },
  {
    title: "Promotions",
    description: "Ajouter, publier, modifier ou supprimer les offres.",
    href: "/admin/deals",
    icon: "🔥",
    badge: "Offres",
  },
  {
    title: "Import promos",
    description:
      "Scanner les liens web, Facebook ou TikTok des magasins avec Gemini.",
    href: "/admin/import-promotions",
    icon: "✨",
    badge: "IA",
    highlighted: true,
  },
  {
    title: "Abonnements",
    description: "Suivre les plans, statuts et renouvellements d’abonnement.",
    href: "/admin/subscriptions",
    icon: "💳",
    badge: "Revenus",
  },
  {
    title: "Plans",
    description: "Modifier les prix, limites et fréquences des formules.",
    href: "/admin/plans",
    icon: "📦",
    badge: "Forfaits",
  },
  {
    title: "Notifications",
    description:
      "Simuler et suivre les alertes WhatsApp envoyées aux utilisateurs.",
    href: "/admin/notifications",
    icon: "🔔",
    badge: "WhatsApp",
    highlighted: true,
  },
  {
    title: "Historique alertes",
    description:
      "Consulter toutes les notifications WhatsApp simulées ou envoyées.",
    href: "/admin/notification-logs",
    icon: "🧾",
    badge: "Logs",
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

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
      setMessage(
        `Erreur lors du chargement des statistiques : ${firstError.message}`
      );
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
      icon: "👥",
      helper: "profils créés",
    },
    {
      label: "Magasins",
      value: stats.stores,
      href: "/admin/stores",
      icon: "🏬",
      helper: "enseignes",
    },
    {
      label: "Catégories",
      value: stats.categories,
      href: "/admin/categories",
      icon: "🏷️",
      helper: "segments",
    },
    {
      label: "Brouillons",
      value: stats.draftDeals,
      href: "/admin/deals",
      icon: "📝",
      helper: "à valider",
    },
    {
      label: "Promos publiées",
      value: stats.publishedDeals,
      href: "/admin/deals",
      icon: "🔥",
      helper: "visibles",
    },
    {
      label: "Abonnements actifs",
      value: stats.activeSubscriptions,
      href: "/admin/subscriptions",
      icon: "💳",
      helper: "clients actifs",
    },
    {
      label: "Alertes",
      value: stats.notifications,
      href: "/admin/notification-logs",
      icon: "🔔",
      helper: "logs",
    },
  ];

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
            <a href="/" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-300 font-black text-slate-950 shadow-lg shadow-emerald-500/25">
                P
              </span>

              <span className="text-2xl font-black tracking-tight">
                Promo<span className="text-emerald-400">Pulse</span>
              </span>
            </a>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={loadStats}
                disabled={isLoading}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Actualisation..." : "Actualiser"}
              </button>

              <a
                href="/admin/import-promotions"
                className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
              >
                ✨ Import Gemini
              </a>

              <a
                href="/admin/deals/new"
                className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5"
              >
                + Nouvelle promo
              </a>
            </div>
          </header>

          {message && (
            <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200 backdrop-blur-xl">
              {message}
            </div>
          )}

          <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-2xl backdrop-blur-2xl md:p-9">
              <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,.8)]" />
                  Back-office PromoPulse
                </span>

                <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Pilotez toute la{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                    plateforme
                  </span>
                  .
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Gérez les utilisateurs, les magasins, les catégories, les
                  promotions, les abonnements, l’import Gemini et les alertes
                  WhatsApp depuis un tableau de bord centralisé.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="/admin/import-promotions"
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-300 px-6 py-4 font-black text-slate-950 shadow-[0_12px_48px_rgba(16,185,129,.30)] transition hover:-translate-y-0.5"
                  >
                    Lancer un import IA
                    <span className="transition group-hover:translate-x-1">
                      →
                    </span>
                  </a>

                  <a
                    href="/admin/deals"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
                  >
                    Gérer les promotions
                  </a>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Promos publiées</p>
                    <p className="mt-2 text-4xl font-black">
                      {formatNumber(stats.publishedDeals)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Brouillons</p>
                    <p className="mt-2 text-4xl font-black">
                      {formatNumber(stats.draftDeals)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <p className="text-sm text-emerald-200">Abonnements</p>
                    <p className="mt-2 text-4xl font-black text-emerald-300">
                      {formatNumber(stats.activeSubscriptions)}
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
                    Priorités produit
                  </p>

                  <h2 className="mt-4 text-3xl font-black">
                    MVP opérationnel, intégrations à venir.
                  </h2>

                  <p className="mt-4 leading-7 text-emerald-100">
                    La plateforme est prête pour démonstration. Les prochaines
                    grandes briques concernent les paiements, WhatsApp réel et
                    les APIs Meta/TikTok.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-4">
                    <p className="text-sm font-bold text-white">
                      WhatsApp Business
                    </p>
                    <p className="mt-1 text-xs leading-5 text-emerald-100">
                      Remplacer la simulation par un envoi réel.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-4">
                    <p className="text-sm font-bold text-white">
                      Meta / TikTok APIs
                    </p>
                    <p className="mt-1 text-xs leading-5 text-emerald-100">
                      Collecter les promotions depuis les sources officielles.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-4">
                    <p className="text-sm font-bold text-white">Paiements</p>
                    <p className="mt-1 text-xs leading-5 text-emerald-100">
                      Activer le paiement réel des forfaits.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {statCards.map((stat) => (
              <a
                key={stat.label}
                href={stat.href}
                className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-emerald-950/30"
              >
                <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-400/10 blur-3xl" />
                </div>

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-xl">
                      {stat.icon}
                    </div>

                    <span className="text-slate-600 transition group-hover:text-emerald-300">
                      →
                    </span>
                  </div>

                  <p className="mt-5 text-sm text-slate-500">{stat.label}</p>

                  <p className="mt-2 text-4xl font-black">
                    {isLoading ? "..." : formatNumber(stat.value)}
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {stat.helper}
                  </p>
                </div>
              </a>
            ))}
          </section>

          <section className="mt-12 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl md:p-7">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                    Accès rapides
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    Modules d’administration
                  </h2>
                </div>

                {isLoading && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-400">
                    Chargement...
                  </span>
                )}
              </div>

              <div className="mt-6 grid gap-3">
                {adminCards.slice(0, 5).map((card) => (
                  <a
                    key={card.title}
                    href={card.href}
                    className={`group rounded-3xl border p-5 transition hover:-translate-y-0.5 ${
                      card.highlighted
                        ? "border-emerald-400/30 bg-emerald-400/10"
                        : "border-white/10 bg-slate-950/50 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${
                          card.highlighted
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-white/[0.05]"
                        }`}
                      >
                        {card.icon}
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold">{card.title}</h3>
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-slate-400">
                            {card.badge}
                          </span>
                        </div>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {card.description}
                        </p>
                      </div>

                      <span className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-300">
                        →
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl md:p-7">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                    Gestion avancée
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    Revenus, alertes et configuration
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {adminCards.slice(5).map((card) => (
                  <a
                    key={card.title}
                    href={card.href}
                    className={`group relative overflow-hidden rounded-[2rem] border p-6 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/30 ${
                      card.highlighted
                        ? "border-emerald-400/30 bg-emerald-400/10"
                        : "border-white/10 bg-slate-950/50 hover:border-emerald-400/30 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-400/10 blur-3xl opacity-0 transition group-hover:opacity-100" />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${
                            card.highlighted
                              ? "bg-emerald-400 text-slate-950"
                              : "border border-white/10 bg-white/[0.05]"
                          }`}
                        >
                          {card.icon}
                        </div>

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-400">
                          {card.badge}
                        </span>
                      </div>

                      <h3 className="mt-6 text-xl font-black">{card.title}</h3>

                      <p className="mt-3 min-h-16 text-sm leading-6 text-slate-500">
                        {card.description}
                      </p>

                      <span className="mt-5 inline-flex text-sm font-bold text-emerald-300 transition group-hover:translate-x-1">
                        Ouvrir →
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-12 overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/15 via-white/[0.04] to-slate-950 p-7 backdrop-blur-xl md:p-8">
            <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">
                  Workflow recommandé
                </p>

                <h2 className="mt-4 text-3xl font-black md:text-4xl">
                  Le meilleur scénario de démo admin.
                </h2>

                <p className="mt-4 leading-7 text-slate-400">
                  Pour présenter PromoPulse, suivez ce parcours : importer une
                  promotion avec Gemini, l’enregistrer en brouillon, la publier,
                  puis simuler les notifications WhatsApp ciblées.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="/admin/import-promotions"
                    className="inline-flex justify-center rounded-2xl bg-white px-6 py-3 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
                  >
                    Commencer l’import
                  </a>

                  <a
                    href="/admin/notifications"
                    className="inline-flex justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white transition hover:bg-white/[0.08]"
                  >
                    Simuler les alertes
                  </a>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    step: "01",
                    title: "Scanner",
                    text: "Analyser les liens d’un magasin avec Gemini.",
                  },
                  {
                    step: "02",
                    title: "Corriger",
                    text: "Valider les titres, prix, catégories et images.",
                  },
                  {
                    step: "03",
                    title: "Publier",
                    text: "Rendre la promotion visible côté utilisateur.",
                  },
                  {
                    step: "04",
                    title: "Notifier",
                    text: "Simuler l’envoi WhatsApp aux utilisateurs ciblés.",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="rounded-3xl border border-white/10 bg-slate-950/50 p-5"
                  >
                    <span className="text-sm font-black text-emerald-300">
                      {item.step}
                    </span>

                    <h3 className="mt-4 font-black">{item.title}</h3>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}