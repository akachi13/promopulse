"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

type NotificationLogRow = {
  id: string;
  user_id: string;
  deal_id: string | null;
  channel: string | null;
  message: string | null;
  status: string | null;
  sent_at: string | null;
  created_at: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp_number: string | null;
};

type Deal = {
  id: string;
  title: string;
  discount_percentage: number | null;
  store_id: string | null;
};

type Store = {
  id: string;
  name: string;
};

type NotificationLog = NotificationLogRow & {
  profile: Profile | null;
  deal: Deal | null;
  store: Store | null;
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

function getStatusLabel(status: string | null) {
  if (status === "simulated") return "Simulée";
  if (status === "sent") return "Envoyée";
  if (status === "failed") return "Échec";
  return status || "Non renseigné";
}

function getStatusIcon(status: string | null) {
  if (status === "simulated") return "🧪";
  if (status === "sent") return "✅";
  if (status === "failed") return "⛔";
  return "📨";
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

  return channel || "Canal non renseigné";
}

function getChannelIcon(channel: string | null) {
  if (channel === "whatsapp") return "💬";
  if (channel === "email") return "✉️";
  if (channel === "push") return "🔔";

  return "📨";
}

export default function AdminNotificationLogsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  async function loadLogs() {
    setIsLoading(true);
    setMessage("");

    const { data: logsData, error: logsError } = await supabase
      .from("notification_logs")
      .select(
        "id, user_id, deal_id, channel, message, status, sent_at, created_at"
      )
      .order("created_at", { ascending: false });

    if (logsError) {
      setMessage(
        `Erreur lors du chargement des notifications : ${logsError.message}`
      );
      setIsLoading(false);
      return;
    }

    const logRows = (logsData || []) as NotificationLogRow[];

    const userIds = Array.from(
      new Set(logRows.map((log) => log.user_id).filter(Boolean))
    );

    const dealIds = Array.from(
      new Set(logRows.map((log) => log.deal_id).filter(Boolean))
    ) as string[];

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email, whatsapp_number")
      .in(
        "id",
        userIds.length > 0
          ? userIds
          : ["00000000-0000-0000-0000-000000000000"]
      );

    if (profilesError) {
      setMessage(
        `Erreur lors du chargement des profils : ${profilesError.message}`
      );
      setIsLoading(false);
      return;
    }

    const { data: dealsData, error: dealsError } = await supabase
      .from("deals")
      .select("id, title, discount_percentage, store_id")
      .in(
        "id",
        dealIds.length > 0
          ? dealIds
          : ["00000000-0000-0000-0000-000000000000"]
      );

    if (dealsError) {
      setMessage(
        `Erreur lors du chargement des promotions : ${dealsError.message}`
      );
      setIsLoading(false);
      return;
    }

    const deals = (dealsData || []) as Deal[];

    const storeIds = Array.from(
      new Set(deals.map((deal) => deal.store_id).filter(Boolean))
    ) as string[];

    const { data: storesData, error: storesError } = await supabase
      .from("stores")
      .select("id, name")
      .in(
        "id",
        storeIds.length > 0
          ? storeIds
          : ["00000000-0000-0000-0000-000000000000"]
      );

    if (storesError) {
      setMessage(
        `Erreur lors du chargement des magasins : ${storesError.message}`
      );
      setIsLoading(false);
      return;
    }

    const profiles = (profilesData || []) as Profile[];
    const stores = (storesData || []) as Store[];

    const mergedLogs: NotificationLog[] = logRows.map((log) => {
      const profile = profiles.find((item) => item.id === log.user_id) || null;
      const deal = deals.find((item) => item.id === log.deal_id) || null;
      const store = stores.find((item) => item.id === deal?.store_id) || null;

      return {
        ...log,
        profile,
        deal,
        store,
      };
    });

    setLogs(mergedLogs);
    setIsLoading(false);
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesStatus =
        statusFilter === "all" || log.status === statusFilter;

      const normalizedSearch = search.toLowerCase().trim();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        (log.profile?.full_name || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (log.profile?.email || "").toLowerCase().includes(normalizedSearch) ||
        (log.profile?.whatsapp_number || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (log.deal?.title || "").toLowerCase().includes(normalizedSearch) ||
        (log.store?.name || "").toLowerCase().includes(normalizedSearch) ||
        (log.channel || "").toLowerCase().includes(normalizedSearch) ||
        (log.status || "").toLowerCase().includes(normalizedSearch) ||
        (log.message || "").toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [logs, statusFilter, search]);

  const stats = useMemo(() => {
    return {
      all: logs.length,
      simulated: logs.filter((log) => log.status === "simulated").length,
      sent: logs.filter((log) => log.status === "sent").length,
      failed: logs.filter((log) => log.status === "failed").length,
    };
  }, [logs]);

  const latestLog = logs[0] || null;

  const filters = [
    {
      key: "all",
      label: "Toutes",
      count: stats.all,
      icon: "📨",
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
              Chargement de l’historique...
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
                onClick={loadLogs}
                disabled={isLoading}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Actualisation..." : "Actualiser"}
              </button>

              <a
                href="/admin/notifications"
                className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5"
              >
                + Nouvelle simulation
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
                  Historique des notifications
                </span>

                <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Suivez toutes les{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                    alertes
                  </span>{" "}
                  PromoPulse.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Consultez toutes les alertes WhatsApp simulées, envoyées ou en
                  échec. Retrouvez le destinataire, la promotion, le magasin, le
                  message et le statut de chaque notification.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Total logs</p>
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
                    Dernière activité
                  </p>

                  {latestLog ? (
                    <>
                      <h2 className="mt-4 text-3xl font-black">
                        {latestLog.deal?.title || "Notification récente"}
                      </h2>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-4 py-2 text-sm font-bold ${getStatusClass(
                            latestLog.status
                          )}`}
                        >
                          {getStatusIcon(latestLog.status)}{" "}
                          {getStatusLabel(latestLog.status)}
                        </span>

                        <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                          {getChannelIcon(latestLog.channel)}{" "}
                          {getChannelLabel(latestLog.channel)}
                        </span>
                      </div>

                      <p className="mt-5 text-sm leading-6 text-emerald-100">
                        Destinataire :{" "}
                        <span className="font-bold text-white">
                          {latestLog.profile?.full_name ||
                            latestLog.profile?.email ||
                            "Utilisateur non renseigné"}
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
                        Aucun log enregistré
                      </h2>

                      <p className="mt-4 leading-7 text-emerald-100">
                        Lancez une simulation WhatsApp pour créer les premières
                        lignes dans l’historique.
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                  <p className="text-sm font-bold text-white">
                    Traçabilité
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    Chaque simulation est conservée dans notification_logs pour
                    suivre les campagnes, les destinataires et les statuts.
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
                  placeholder="Rechercher par utilisateur, WhatsApp, promotion, magasin, canal ou message..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-12 py-4 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-sm font-semibold text-slate-300">
                  {filteredLogs.length} résultat(s)
                </div>

                <a
                  href="/admin/notifications"
                  className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-4 text-center text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/20"
                >
                  Nouvelle simulation
                </a>
              </div>
            </div>
          </section>

          {!isLoading && filteredLogs.length === 0 && (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-3xl">
                🧭
              </div>

              <h2 className="mt-6 text-2xl font-black">
                Aucune notification trouvée
              </h2>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
                Essayez un autre filtre, modifiez votre recherche ou lancez une
                nouvelle simulation WhatsApp.
              </p>

              <a
                href="/admin/notifications"
                className="mt-6 inline-flex justify-center rounded-full bg-white px-5 py-2.5 font-bold text-slate-950"
              >
                Simuler une alerte
              </a>
            </section>
          )}

          {!isLoading && filteredLogs.length > 0 && (
            <section className="mt-10 space-y-5">
              {filteredLogs.map((log) => (
                <article
                  key={log.id}
                  className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-emerald-950/30"
                >
                  <div className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full border px-4 py-2 text-xs font-black ${getStatusClass(
                            log.status
                          )}`}
                        >
                          {getStatusIcon(log.status)}{" "}
                          {getStatusLabel(log.status)}
                        </span>

                        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300">
                          {getChannelIcon(log.channel)}{" "}
                          {getChannelLabel(log.channel)}
                        </span>

                        {log.deal?.discount_percentage && (
                          <span className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950">
                            -{log.deal.discount_percentage}%
                          </span>
                        )}
                      </div>

                      <h2 className="mt-5 text-2xl font-black">
                        {log.deal?.title || "Promotion non renseignée"}
                      </h2>

                      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                          <p className="text-xs text-slate-500">Utilisateur</p>
                          <p className="mt-1 truncate font-bold text-slate-200">
                            {log.profile?.full_name || "Nom non renseigné"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                          <p className="text-xs text-slate-500">Email</p>
                          <p className="mt-1 truncate font-bold text-slate-200">
                            {log.profile?.email || "Non renseigné"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                          <p className="text-xs text-slate-500">WhatsApp</p>
                          <p className="mt-1 truncate font-bold text-slate-200">
                            {log.profile?.whatsapp_number || "Non renseigné"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                          <p className="text-xs text-slate-500">Magasin</p>
                          <p className="mt-1 truncate font-bold text-slate-200">
                            {log.store?.name || "Non renseigné"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                          Message enregistré
                        </p>

                        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                          {log.message || "Aucun message enregistré."}
                        </p>
                      </div>
                    </div>

                    <aside className="rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                        Détails
                      </p>

                      <div className="mt-5 space-y-4">
                        <div>
                          <p className="text-xs text-slate-500">
                            Envoyée / simulée le
                          </p>
                          <p className="mt-1 font-bold text-slate-200">
                            {formatDate(log.sent_at || log.created_at)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Canal</p>
                          <p className="mt-1 font-bold text-slate-200">
                            {getChannelLabel(log.channel)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Statut</p>
                          <p className="mt-1 font-bold text-slate-200">
                            {getStatusLabel(log.status)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">ID log</p>
                          <p className="mt-1 break-all text-xs font-semibold text-slate-500">
                            {log.id}
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
    </AdminGuard>
  );
}