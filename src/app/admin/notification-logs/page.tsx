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

function getStatusClass(status: string | null) {
  if (status === "sent") {
    return "bg-emerald-400/20 text-emerald-300";
  }

  if (status === "simulated") {
    return "bg-amber-400/20 text-amber-200";
  }

  if (status === "failed") {
    return "bg-red-400/20 text-red-300";
  }

  return "bg-white/10 text-slate-300";
}

export default function AdminNotificationLogsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  async function loadLogs() {
    setIsLoading(true);
    setMessage("");

    const { data: logsData, error: logsError } = await supabase
      .from("notification_logs")
      .select("id, user_id, deal_id, channel, message, status, sent_at, created_at")
      .order("created_at", { ascending: false });

    if (logsError) {
      setMessage(`Erreur lors du chargement des notifications : ${logsError.message}`);
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
      .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    if (profilesError) {
      setMessage(`Erreur lors du chargement des profils : ${profilesError.message}`);
      setIsLoading(false);
      return;
    }

    const { data: dealsData, error: dealsError } = await supabase
      .from("deals")
      .select("id, title, discount_percentage, store_id")
      .in("id", dealIds.length > 0 ? dealIds : ["00000000-0000-0000-0000-000000000000"]);

    if (dealsError) {
      setMessage(`Erreur lors du chargement des promotions : ${dealsError.message}`);
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
      .in("id", storeIds.length > 0 ? storeIds : ["00000000-0000-0000-0000-000000000000"]);

    if (storesError) {
      setMessage(`Erreur lors du chargement des magasins : ${storesError.message}`);
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
                Historique des notifications
              </h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                Consultez toutes les alertes WhatsApp simulées, envoyées ou en
                échec pour les utilisateurs PromoPulse.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={loadLogs}
                disabled={isLoading}
                className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
              >
                {isLoading ? "Actualisation..." : "Actualiser"}
              </button>

              <a
                href="/admin/notifications"
                className="rounded-full bg-emerald-400 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Simuler une alerte
              </a>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "all"
                  ? "border-emerald-400 bg-emerald-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Toutes</p>
              <p className="mt-1 text-3xl font-bold">{stats.all}</p>
            </button>

            <button
              onClick={() => setStatusFilter("simulated")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "simulated"
                  ? "border-amber-400 bg-amber-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Simulées</p>
              <p className="mt-1 text-3xl font-bold">{stats.simulated}</p>
            </button>

            <button
              onClick={() => setStatusFilter("sent")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "sent"
                  ? "border-emerald-400 bg-emerald-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Envoyées</p>
              <p className="mt-1 text-3xl font-bold">{stats.sent}</p>
            </button>

            <button
              onClick={() => setStatusFilter("failed")}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                statusFilter === "failed"
                  ? "border-red-400 bg-red-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">Échecs</p>
              <p className="mt-1 text-3xl font-bold">{stats.failed}</p>
            </button>
          </div>

          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher par utilisateur, WhatsApp, promotion, magasin ou message..."
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
              />

              <a
                href="/admin/notifications"
                className="rounded-full border border-emerald-400/40 px-6 py-3 text-center font-semibold text-emerald-300 transition hover:bg-emerald-400/10"
              >
                Nouvelle simulation
              </a>
            </div>
          </div>

          {isLoading && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Chargement de l’historique...
            </div>
          )}

          {message && (
            <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
              {message}
            </div>
          )}

          {!isLoading && filteredLogs.length === 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Aucune notification ne correspond au filtre sélectionné.
            </div>
          )}

          {!isLoading && filteredLogs.length > 0 && (
            <div className="mt-10 space-y-5">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                          {log.channel || "whatsapp"}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusClass(
                            log.status
                          )}`}
                        >
                          {getStatusLabel(log.status)}
                        </span>

                        {log.deal?.discount_percentage && (
                          <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                            -{log.deal.discount_percentage}%
                          </span>
                        )}
                      </div>

                      <h2 className="mt-5 text-2xl font-bold">
                        {log.deal?.title || "Promotion non renseignée"}
                      </h2>

                      <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2 lg:grid-cols-4">
                        <p>
                          Utilisateur :{" "}
                          <span className="text-white">
                            {log.profile?.full_name || "Nom non renseigné"}
                          </span>
                        </p>

                        <p>
                          Email :{" "}
                          <span className="break-all text-white">
                            {log.profile?.email || "Non renseigné"}
                          </span>
                        </p>

                        <p>
                          WhatsApp :{" "}
                          <span className="text-white">
                            {log.profile?.whatsapp_number || "Non renseigné"}
                          </span>
                        </p>

                        <p>
                          Magasin :{" "}
                          <span className="text-white">
                            {log.store?.name || "Non renseigné"}
                          </span>
                        </p>
                      </div>

                      <div className="mt-5 rounded-2xl bg-slate-900 p-5">
                        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                          {log.message || "Aucun message enregistré."}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-44 text-sm text-slate-400">
                      <p>Envoyée/simulée le :</p>
                      <p className="mt-1 font-semibold text-slate-200">
                        {formatDate(log.sent_at || log.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}