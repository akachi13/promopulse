"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp_number: string | null;
  country: string | null;
  city: string | null;
  role: string | null;
  account_status: string | null;
  onboarding_completed: boolean | null;
  created_at: string | null;
};

type RoleFilter = "all" | "user" | "admin";
type StatusFilter = "all" | "active" | "suspended" | "inactive";

function formatDate(date: string | null) {
  if (!date) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function getRoleLabel(role: string | null) {
  if (role === "admin") return "Administrateur";
  if (role === "user") return "Utilisateur";
  return role || "Utilisateur";
}

function getRoleClass(role: string | null) {
  if (role === "admin") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }

  return "border-cyan-400/25 bg-cyan-400/10 text-cyan-300";
}

function getStatusLabel(status: string | null) {
  if (status === "active") return "Actif";
  if (status === "suspended") return "Suspendu";
  if (status === "inactive") return "Inactif";
  return status || "Actif";
}

function getStatusClass(status: string | null) {
  if (status === "active") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "suspended") {
    return "border-red-400/25 bg-red-400/10 text-red-300";
  }

  if (status === "inactive") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }

  return "border-white/10 bg-white/[0.04] text-slate-300";
}

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  async function loadProfiles() {
    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, whatsapp_number, country, city, role, account_status, onboarding_completed, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Erreur lors du chargement des utilisateurs : ${error.message}`);
      setIsLoading(false);
      return;
    }

    setProfiles((data || []) as Profile[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  async function updateRole(userId: string, role: string) {
    setMessage("");
    setUpdatingUserId(userId);

    const { error } = await supabase
      .from("profiles")
      .update({
        role,
      })
      .eq("id", userId);

    setUpdatingUserId(null);

    if (error) {
      setMessage(`Erreur lors du changement de rôle : ${error.message}`);
      return;
    }

    setProfiles((current) =>
      current.map((profile) =>
        profile.id === userId ? { ...profile, role } : profile
      )
    );

    setMessage("Rôle mis à jour avec succès.");
  }

  async function updateStatus(userId: string, accountStatus: string) {
    setMessage("");
    setUpdatingUserId(userId);

    const { error } = await supabase
      .from("profiles")
      .update({
        account_status: accountStatus,
      })
      .eq("id", userId);

    setUpdatingUserId(null);

    if (error) {
      setMessage(`Erreur lors du changement de statut : ${error.message}`);
      return;
    }

    setProfiles((current) =>
      current.map((profile) =>
        profile.id === userId
          ? { ...profile, account_status: accountStatus }
          : profile
      )
    );

    setMessage("Statut du compte mis à jour avec succès.");
  }

  const stats = useMemo(() => {
    return {
      all: profiles.length,
      users: profiles.filter((profile) => (profile.role || "user") === "user")
        .length,
      admins: profiles.filter((profile) => profile.role === "admin").length,
      active: profiles.filter(
        (profile) => (profile.account_status || "active") === "active"
      ).length,
      suspended: profiles.filter(
        (profile) => profile.account_status === "suspended"
      ).length,
      onboardingDone: profiles.filter(
        (profile) => profile.onboarding_completed === true
      ).length,
    };
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const normalizedSearch = search.toLowerCase().trim();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        (profile.full_name || "").toLowerCase().includes(normalizedSearch) ||
        (profile.email || "").toLowerCase().includes(normalizedSearch) ||
        (profile.whatsapp_number || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (profile.country || "").toLowerCase().includes(normalizedSearch) ||
        (profile.city || "").toLowerCase().includes(normalizedSearch) ||
        (profile.role || "").toLowerCase().includes(normalizedSearch) ||
        (profile.account_status || "")
          .toLowerCase()
          .includes(normalizedSearch);

      const profileRole = profile.role || "user";
      const profileStatus = profile.account_status || "active";

      const matchesRole = roleFilter === "all" || profileRole === roleFilter;
      const matchesStatus =
        statusFilter === "all" || profileStatus === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [profiles, search, roleFilter, statusFilter]);

  const latestUser = profiles[0] || null;

  const roleFilters = [
    {
      key: "all",
      label: "Tous",
      count: stats.all,
      icon: "👥",
    },
    {
      key: "user",
      label: "Utilisateurs",
      count: stats.users,
      icon: "🙂",
    },
    {
      key: "admin",
      label: "Admins",
      count: stats.admins,
      icon: "🛡️",
    },
  ] as const;

  const statusFilters = [
    {
      key: "all",
      label: "Tous statuts",
      count: stats.all,
      icon: "📋",
    },
    {
      key: "active",
      label: "Actifs",
      count: stats.active,
      icon: "✅",
    },
    {
      key: "suspended",
      label: "Suspendus",
      count: stats.suspended,
      icon: "⛔",
    },
    {
      key: "inactive",
      label: "Inactifs",
      count: profiles.filter((profile) => profile.account_status === "inactive")
        .length,
      icon: "🕓",
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
              Chargement des utilisateurs...
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
                onClick={loadProfiles}
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
                href="/admin/notifications"
                className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
              >
                🔔 Notifier
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
                  Gestion des utilisateurs
                </span>

                <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Supervisez vos{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                    comptes
                  </span>{" "}
                  PromoPulse.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Consultez les utilisateurs inscrits, leurs rôles, statuts,
                  numéros WhatsApp, villes et progression d’onboarding.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Total utilisateurs</p>
                    <p className="mt-2 text-4xl font-black">{stats.all}</p>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <p className="text-sm text-emerald-200">Actifs</p>
                    <p className="mt-2 text-4xl font-black text-emerald-300">
                      {stats.active}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-cyan-400/25 bg-cyan-400/10 p-5">
                    <p className="text-sm text-cyan-200">Onboardés</p>
                    <p className="mt-2 text-4xl font-black text-cyan-300">
                      {stats.onboardingDone}
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
                    Dernier inscrit
                  </p>

                  {latestUser ? (
                    <>
                      <h2 className="mt-4 text-3xl font-black">
                        {latestUser.full_name ||
                          latestUser.email ||
                          "Utilisateur récent"}
                      </h2>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-4 py-2 text-sm font-bold ${getRoleClass(
                            latestUser.role
                          )}`}
                        >
                          {getRoleLabel(latestUser.role)}
                        </span>

                        <span
                          className={`rounded-full border px-4 py-2 text-sm font-bold ${getStatusClass(
                            latestUser.account_status
                          )}`}
                        >
                          {getStatusLabel(latestUser.account_status)}
                        </span>
                      </div>

                      <p className="mt-5 text-sm leading-6 text-emerald-100">
                        Email :{" "}
                        <span className="font-bold text-white">
                          {latestUser.email || "Non renseigné"}
                        </span>
                      </p>

                      <p className="mt-2 text-sm leading-6 text-emerald-100">
                        Inscription :{" "}
                        <span className="font-bold text-white">
                          {formatDate(latestUser.created_at)}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-4 text-3xl font-black">
                        Aucun utilisateur
                      </h2>

                      <p className="mt-4 leading-7 text-emerald-100">
                        Les comptes créés depuis l’inscription apparaîtront ici.
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                  <p className="text-sm font-bold text-white">
                    Administration
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    Vous pouvez changer le rôle et le statut d’un utilisateur
                    directement depuis cette page.
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {roleFilters.map((item) => {
              const isActive = roleFilter === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => setRoleFilter(item.key)}
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

          <section className="mt-6 grid gap-4 md:grid-cols-4">
            {statusFilters.map((item) => {
              const isActive = statusFilter === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key)}
                  className={`rounded-[1.5rem] border p-4 text-left transition ${
                    isActive
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                  }`}
                >
                  <p className="text-xl">{item.icon}</p>
                  <p className="mt-3 text-sm text-slate-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-black">{item.count}</p>
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
                  placeholder="Rechercher par nom, email, WhatsApp, pays, ville, rôle ou statut..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-12 py-4 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-sm font-semibold text-slate-300">
                {filteredProfiles.length} résultat(s)
              </div>
            </div>
          </section>

          {filteredProfiles.length === 0 && (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-3xl">
                🧭
              </div>

              <h2 className="mt-6 text-2xl font-black">
                Aucun utilisateur trouvé
              </h2>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
                Essayez un autre filtre ou modifiez votre recherche.
              </p>
            </section>
          )}

          {filteredProfiles.length > 0 && (
            <section className="mt-10 grid gap-5">
              {filteredProfiles.map((profile) => {
                const isUpdating = updatingUserId === profile.id;

                return (
                  <article
                    key={profile.id}
                    className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-emerald-950/30"
                  >
                    <div className="grid gap-6 lg:grid-cols-[1fr_0.45fr]">
                      <div>
                        <div className="flex flex-col gap-5 md:flex-row md:items-start">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-300 text-2xl font-black text-slate-950 shadow-lg shadow-emerald-500/20">
                            {(profile.full_name || profile.email || "U")
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>

                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <h2 className="text-2xl font-black">
                                {profile.full_name || "Nom non renseigné"}
                              </h2>

                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-black ${getRoleClass(
                                  profile.role
                                )}`}
                              >
                                {getRoleLabel(profile.role)}
                              </span>

                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                                  profile.account_status
                                )}`}
                              >
                                {getStatusLabel(profile.account_status)}
                              </span>

                              {profile.onboarding_completed ? (
                                <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                                  Onboarding terminé
                                </span>
                              ) : (
                                <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">
                                  Onboarding non terminé
                                </span>
                              )}
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                                <p className="text-xs text-slate-500">Email</p>
                                <p className="mt-1 truncate font-bold text-slate-200">
                                  {profile.email || "Non renseigné"}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                                <p className="text-xs text-slate-500">
                                  WhatsApp
                                </p>
                                <p className="mt-1 truncate font-bold text-slate-200">
                                  {profile.whatsapp_number || "Non renseigné"}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                                <p className="text-xs text-slate-500">Ville</p>
                                <p className="mt-1 truncate font-bold text-slate-200">
                                  {profile.city || "Non renseignée"}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                                <p className="text-xs text-slate-500">Pays</p>
                                <p className="mt-1 truncate font-bold text-slate-200">
                                  {profile.country || "Non renseigné"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <aside className="rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                          Actions
                        </p>

                        <div className="mt-5 space-y-4">
                          <div>
                            <label className="text-xs text-slate-500">
                              Rôle
                            </label>

                            <select
                              value={profile.role || "user"}
                              onChange={(event) =>
                                updateRole(profile.id, event.target.value)
                              }
                              disabled={isUpdating}
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-emerald-400 disabled:opacity-60"
                            >
                              <option value="user">user</option>
                              <option value="admin">admin</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-slate-500">
                              Statut
                            </label>

                            <select
                              value={profile.account_status || "active"}
                              onChange={(event) =>
                                updateStatus(profile.id, event.target.value)
                              }
                              disabled={isUpdating}
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-emerald-400 disabled:opacity-60"
                            >
                              <option value="active">active</option>
                              <option value="suspended">suspended</option>
                              <option value="inactive">inactive</option>
                            </select>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                            <p className="text-xs text-slate-500">
                              Inscription
                            </p>
                            <p className="mt-1 font-bold text-slate-200">
                              {formatDate(profile.created_at)}
                            </p>
                          </div>

                          {isUpdating && (
                            <p className="text-sm font-semibold text-emerald-300">
                              Mise à jour...
                            </p>
                          )}
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