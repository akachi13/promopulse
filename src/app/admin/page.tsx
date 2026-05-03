"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

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
    description: "Ajouter, publier ou modifier les offres promotionnelles.",
    href: "/admin/deals",
  },
  {
  title: "Import promos",
  description:
    "Scanner les liens web, Facebook ou TikTok des magasins pour détecter des offres.",
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
];

export default function AdminPage() {
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkAdminAccess() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setMessage(`Erreur profil : ${profileError.message}`);
        setIsChecking(false);
        return;
      }

      if (profile?.role !== "admin") {
        setIsAdmin(false);
        setMessage("Accès refusé. Cette page est réservée aux administrateurs.");
        setIsChecking(false);
        return;
      }

      setIsAdmin(true);
      setIsChecking(false);
    }

    checkAdminAccess();
  }, [router]);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-slate-300">Vérification des droits admin...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-md rounded-3xl border border-red-400/30 bg-red-400/10 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-100">Accès refusé</h1>
          <p className="mt-3 text-red-100">{message}</p>

          <a
            href="/dashboard"
            className="mt-6 inline-flex rounded-full bg-white px-6 py-3 font-semibold text-slate-950"
          >
            Retour au dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="text-xl font-bold">
          Promo<span className="text-emerald-400">Pulse</span>
        </a>

        <div className="mt-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-bold">Administration</h1>
            <p className="mt-2 text-slate-300">
              Espace réservé à la gestion de la plateforme PromoPulse.
            </p>
          </div>

          <a
            href="/admin/deals/new"
            className="inline-flex rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Ajouter une promotion
          </a>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {adminCards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6 transition hover:border-emerald-400/40 hover:bg-white/10"
            >
              <div className="h-12 w-12 rounded-2xl bg-emerald-400/20" />

              <h2 className="mt-5 text-xl font-semibold">{card.title}</h2>

              <p className="mt-2 text-slate-300">{card.description}</p>

              {card.href !== "#" && (
                <span className="mt-6 inline-flex text-sm font-semibold text-emerald-300">
                  Ouvrir →
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}