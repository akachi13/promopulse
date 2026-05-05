"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type NotificationLog = {
  id: string;
  channel: string | null;
  message: string | null;
  status: string | null;
  sent_at: string | null;
  created_at: string | null;
  deals: {
    title: string;
    discount_percentage: number | null;
    stores: {
      name: string;
    } | null;
  } | null;
};

type StatusFilter = "all" | "simulated" | "sent" | "failed";

function formatDate(date: string | null) {
  if (!date) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatStatus(status: string | null) {
  if (status === "simulated") return "Simulation";
  if (status === "sent") return "Envoyée";
  if (status === "failed") return "Échec";
  return status || "Non renseigné";
}

function getStatusIcon(status: string | null) {
  if (status === "simulated") return "🧪";
  if (status === "sent") return "✅";
  if (status === "failed") return "⛔";
  return "🔔";
}

function getStatusClass(status: string | null) {
  if (status === "sent") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "simulated") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }

  if (status === "failed") {
    return "border-red-400/25 bg-red-400/10 text-red-300";
  }

  return "border-white/10 bg-white/[0.04] text-slate-300";
}

function getChannelLabel(channel: string | null) {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "email") return "Email";
  if (channel === "push") return "Push";

  return channel || "WhatsApp";
}

function getChannelIcon(channel: string | null) {
  if (channel === "whatsapp") return "💬";
  if (channel === "email") return "✉️";
  if (channel === "push") return "🔔";

  return "💬";
}

export default function NotificationsPage() {
  const router = useRouter();

  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  async function loadNotifications() {
    setIsLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("notification_logs")
      .select(
        `
        id,
        channel,
        message,
        status,
        sent_at,
        created_at,
        deals(
          title,
          discount_percentage,
          stores(name)
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Erreur lors du chargement des alertes : ${error.message}`);
      setIsLoading(false);
      return;
    }

    setLogs((data || []) as unknown as NotificationLog[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadNotifications();
  }, [router]);

  const stats = useMemo(() => {
    return {
      all: logs.length,
      simulated: logs.filter((log) => log.status === "simulated").length,
      sent: logs.filter((log) => log.status === "sent").length,
      failed: logs.filter((log) => log.status === "failed").length,
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesStatus =
        statusFilter === "all" || log.status === statusFilter;

      const normalizedSearch = search.toLowerCase().trim();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        (log.deals?.title || "").toLowerCase().includes(normalizedSearch) ||
        (log.deals?.stores?.name || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (log.channel || "").toLowerCase().includes(normalizedSearch) ||
        (log.status || "").toLowerCase().includes(normalizedSearch) ||
        (log.message || "").toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [logs, statusFilter, search]);

  const latestLog = logs[0] || null;

  const filters = [
    {
      key: "all",
      label: "Toutes",
      count: stats.all,
      icon: "🔔",
    },
    {
      key: "simulated",
      label: "Simulées",
      count: stats.simulated,
      icon: "🧪",
    },
    {
      key: "sent",
      label: "Envoyées",
      count: stats.sent,
      icon: "✅",
    },
    {
      key: "failed",
      label: "Échecs",
      count: stats.failed,
      icon: "⛔",
    },
  ] as const;

  if (isLoading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6 text-white">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[130px]" />
          <div className="absolute bottom-[-12rem] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-emerald-700/15 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 text-center shadow-2xl backdrop-blur-2xl">
          <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-emerald-400/30" />
          <p className="mt-5 text-slate-300">Chargement des alertes...</p>
        </div>
      </main>
    );
  }

  return (
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
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
          >
            ← Retour au dashboard
          </a>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadNotifications}
              disabled={isLoading}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Actualisation..." : "Actualiser"}
            </button>

            <a
              href="/deals"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              🔥 Promotions
            </a>

            <a
              href="/settings/whatsapp"
              className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
            >
              💬 WhatsApp
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
                Alertes personnalisées
              </span>

              <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                Vos alertes{" "}
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                  PromoPulse
                </span>
                .
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                Retrouvez les notifications WhatsApp générées pour votre compte,
                les promotions associées, les magasins concernés et le contenu
                des messages reçus.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Total alertes</p>
                  <p className="mt-2 text-4xl font-black">{stats.all}</p>
                </div>

                <div className="rounded-3xl border border-amber-400/25 bg-amber-400/10 p-5">
                  <p className="text-sm text-amber-100">Simulées</p>
                  <p className="mt-2 text-4xl font-black text-amber-200">
                    {stats.simulated}
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                  <p className="text-sm text-emerald-200">Envoyées</p>
                  <p className="mt-2 text-4xl font-black text-emerald-300">
                    {stats.sent}
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
                  Dernière alerte
                </p>

                {latestLog ? (
                  <>
                    <h2 className="mt-4 text-3xl font-black">
                      {latestLog.deals?.title || "Alerte récente"}
                    </h2>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-4 py-2 text-sm font-bold ${getStatusClass(
                          latestLog.status
                        )}`}
                      >
                        {getStatusIcon(latestLog.status)}{" "}
                        {formatStatus(latestLog.status)}
                      </span>

                      <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                        {getChannelIcon(latestLog.channel)}{" "}
                        {getChannelLabel(latestLog.channel)}
                      </span>
                    </div>

                    <p className="mt-5 text-sm leading-6 text-emerald-100">
                      Magasin :{" "}
                      <span className="font-bold text-white">
                        {latestLog.deals?.stores?.name || "Non renseigné"}
                      </span>
                    </p>

                    <p className="mt-2 text-sm leading-6 text-emerald-100">
                      Date :{" "}
                      <span className="font-bold text-white">
                        {formatDate(latestLog.sent_at || latestLog.created_at)}
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-4 text-3xl font-black">
                      Aucune alerte pour le moment
                    </h2>

                    <p className="mt-4 leading-7 text-emerald-100">
                      Lorsque l’administrateur simule ou envoie une notification
                      liée à vos préférences, elle apparaîtra ici.
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                <p className="text-sm font-bold text-white">
                  Notifications intelligentes
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-100">
                  Les alertes sont basées sur les magasins et catégories que vous
                  suivez dans PromoPulse.
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
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
                placeholder="Rechercher par promotion, magasin, canal, statut ou message..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-12 py-4 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-sm font-semibold text-slate-300">
              {filteredLogs.length} résultat(s)
            </div>
          </div>
        </section>

        {!message && logs.length === 0 && (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-400/10 text-3xl">
              🔔
            </div>

            <h2 className="mt-6 text-2xl font-black">
              Aucune alerte enregistrée
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
              Vos alertes WhatsApp apparaîtront ici dès qu’une promotion
              correspondant à vos préférences sera simulée ou envoyée.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="/stores"
                className="inline-flex justify-center rounded-full bg-white px-5 py-2.5 font-bold text-slate-950"
              >
                Choisir mes magasins
              </a>

              <a
                href="/categories"
                className="inline-flex justify-center rounded-full border border-white/10 px-5 py-2.5 font-bold text-white hover:bg-white/[0.06]"
              >
                Choisir mes catégories
              </a>
            </div>
          </section>
        )}

        {logs.length > 0 && filteredLogs.length === 0 && (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-3xl">
              🧭
            </div>

            <h2 className="mt-6 text-2xl font-black">
              Aucune alerte ne correspond
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
              Essayez un autre filtre ou modifiez votre recherche.
            </p>
          </section>
        )}

        {filteredLogs.length > 0 && (
          <section className="mt-10 space-y-5">
            {filteredLogs.map((log) => (
              <article
                key={log.id}
                className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-emerald-950/30"
              >
                <div className="grid gap-6 lg:grid-cols-[1fr_0.38fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full border px-4 py-2 text-xs font-black ${getStatusClass(
                          log.status
                        )}`}
                      >
                        {getStatusIcon(log.status)} {formatStatus(log.status)}
                      </span>

                      <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300">
                        {getChannelIcon(log.channel)}{" "}
                        {getChannelLabel(log.channel)}
                      </span>

                      {log.deals?.discount_percentage && (
                        <span className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950">
                          -{log.deals.discount_percentage}%
                        </span>
                      )}
                    </div>

                    <h2 className="mt-5 text-2xl font-black">
                      {log.deals?.title || "Promotion non renseignée"}
                    </h2>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                        <p className="text-xs text-slate-500">Magasin</p>
                        <p className="mt-1 truncate font-bold text-slate-200">
                          {log.deals?.stores?.name || "Non renseigné"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                        <p className="text-xs text-slate-500">Canal</p>
                        <p className="mt-1 truncate font-bold text-slate-200">
                          {getChannelLabel(log.channel)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                        <p className="text-xs text-slate-500">Date</p>
                        <p className="mt-1 truncate font-bold text-slate-200">
                          {formatDate(log.sent_at || log.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                        Message reçu
                      </p>

                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                        {log.message || "Aucun message enregistré."}
                      </p>
                    </div>
                  </div>

                  <aside className="rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                      Résumé
                    </p>

                    <div className="mt-5 space-y-4">
                      <div>
                        <p className="text-xs text-slate-500">Statut</p>
                        <p className="mt-1 font-bold text-slate-200">
                          {formatStatus(log.status)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Canal</p>
                        <p className="mt-1 font-bold text-slate-200">
                          {getChannelLabel(log.channel)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Promotion</p>
                        <p className="mt-1 line-clamp-3 font-bold text-slate-200">
                          {log.deals?.title || "Non renseignée"}
                        </p>
                      </div>
                    </div>
                  </aside>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}