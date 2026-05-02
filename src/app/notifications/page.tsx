"use client";

import { useEffect, useState } from "react";
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

export default function NotificationsPage() {
  const router = useRouter();

  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
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

    loadNotifications();
  }, [router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-slate-300">Chargement des alertes...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <a href="/dashboard" className="text-sm text-emerald-300">
          ← Retour au dashboard
        </a>

        <div className="mt-8">
          <h1 className="text-4xl font-bold">Historique des alertes</h1>
          <p className="mt-2 text-slate-300">
            Consultez les notifications WhatsApp générées pour votre compte.
          </p>
        </div>

        {message && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
            {message}
          </div>
        )}

        {!message && logs.length === 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
            Aucune alerte enregistrée pour le moment.
          </div>
        )}

        <div className="mt-10 space-y-5">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                      {log.channel || "whatsapp"}
                    </span>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                      {formatStatus(log.status)}
                    </span>
                  </div>

                  <h2 className="mt-5 text-xl font-semibold">
                    {log.deals?.title || "Promotion non renseignée"}
                  </h2>

                  <p className="mt-2 text-slate-300">
                    Magasin :{" "}
                    <span className="text-white">
                      {log.deals?.stores?.name || "Non renseigné"}
                    </span>
                  </p>

                  {log.deals?.discount_percentage && (
                    <p className="mt-1 text-slate-300">
                      Réduction :{" "}
                      <span className="font-semibold text-emerald-300">
                        -{log.deals.discount_percentage}%
                      </span>
                    </p>
                  )}
                </div>

                <div className="text-sm text-slate-400">
                  {formatDate(log.sent_at || log.created_at)}
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-900 p-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {log.message || "Aucun message enregistré."}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}