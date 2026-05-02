"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

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
  valid_until: string | null;
  stores: {
    name: string;
  } | null;
};

export default function AdminNotificationsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDealId, setSelectedDealId] = useState("");
  const [messagePreview, setMessagePreview] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, whatsapp_number")
        .order("created_at", { ascending: false });

      const { data: dealsData } = await supabase
        .from("deals")
        .select(
          `
          id,
          title,
          discount_percentage,
          valid_until,
          stores(name)
        `
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      setProfiles((profilesData || []) as Profile[]);
      setDeals((dealsData || []) as unknown as Deal[]);
      setIsLoading(false);
    }

    loadData();
  }, []);

  function generateMessage(userId: string, dealId: string) {
    const user = profiles.find((profile) => profile.id === userId);
    const deal = deals.find((item) => item.id === dealId);

    if (!user || !deal) {
      setMessagePreview("");
      return;
    }

    const userName = user.full_name || "cher client";
    const storeName = deal.stores?.name || "un magasin partenaire";
    const discount = deal.discount_percentage
      ? `-${deal.discount_percentage}%`
      : "promotion spéciale";

    const text = `Bonjour ${userName} 👋

Nouvelle offre PromoPulse chez ${storeName} :

${deal.title}
Réduction : ${discount}

Connectez-vous à PromoPulse pour voir les détails de l’offre.`;

    setMessagePreview(text);
  }

  function handleUserChange(userId: string) {
    setSelectedUserId(userId);
    generateMessage(userId, selectedDealId);
  }

  function handleDealChange(dealId: string) {
    setSelectedDealId(dealId);
    generateMessage(selectedUserId, dealId);
  }

  async function handleSendSimulation() {
    setStatusMessage("");

    if (!selectedUserId || !selectedDealId || !messagePreview) {
      setStatusMessage("Veuillez sélectionner un utilisateur et une promotion.");
      return;
    }

    setIsSending(true);

    const { error } = await supabase.from("notification_logs").insert({
      user_id: selectedUserId,
      deal_id: selectedDealId,
      channel: "whatsapp",
      message: messagePreview,
      status: "simulated",
      sent_at: new Date().toISOString(),
    });

    setIsSending(false);

    if (error) {
      setStatusMessage(`Erreur : ${error.message}`);
      return;
    }

    setStatusMessage(
      "Simulation enregistrée avec succès dans notification_logs."
    );
  }

  if (isLoading) {
    return (
      <AdminGuard>
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-slate-300">Chargement des notifications...</p>
          </div>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <a href="/admin" className="text-sm text-emerald-300">
            ← Retour à l’administration
          </a>

          <div className="mt-8">
            <h1 className="text-4xl font-bold">Simulation WhatsApp</h1>
            <p className="mt-2 text-slate-300">
              Simulez l’envoi d’une alerte promotionnelle WhatsApp à un
              utilisateur.
            </p>
          </div>

          {statusMessage && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
              {statusMessage}
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <div>
                <label className="text-sm text-slate-300">Utilisateur</label>
                <select
                  value={selectedUserId}
                  onChange={(event) => handleUserChange(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                >
                  <option value="">Sélectionner un utilisateur</option>

                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email || "Utilisateur"} —{" "}
                      {profile.whatsapp_number || "WhatsApp non renseigné"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-300">Promotion</label>
                <select
                  value={selectedDealId}
                  onChange={(event) => handleDealChange(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                >
                  <option value="">Sélectionner une promotion</option>

                  {deals.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {deal.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSendSimulation}
                disabled={isSending}
                className="w-full rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
              >
                {isSending
                  ? "Simulation en cours..."
                  : "Simuler l’envoi WhatsApp"}
              </button>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Aperçu du message</h2>

              {messagePreview ? (
                <pre className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-900 p-5 text-sm leading-7 text-slate-200">
                  {messagePreview}
                </pre>
              ) : (
                <div className="mt-5 rounded-2xl bg-slate-900 p-5 text-slate-400">
                  Sélectionnez un utilisateur et une promotion pour générer
                  l’aperçu.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}