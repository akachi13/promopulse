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
  store_id: string | null;
  category_id: string | null;
  stores: {
    name: string;
  } | null;
};

type UserStore = {
  user_id: string;
};

type UserCategory = {
  user_id: string;
};

function formatDate(date: string | null) {
  if (!date) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function AdminNotificationsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [targetedUserIds, setTargetedUserIds] = useState<string[]>([]);
  const [messagePreview, setMessagePreview] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTargetLoading, setIsTargetLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, whatsapp_number")
        .order("created_at", { ascending: false });

      if (profilesError) {
        setStatusMessage(
          `Erreur lors du chargement des utilisateurs : ${profilesError.message}`
        );
      }

      const { data: dealsData, error: dealsError } = await supabase
        .from("deals")
        .select(
          `
          id,
          title,
          discount_percentage,
          valid_until,
          store_id,
          category_id,
          stores(name)
        `
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (dealsError) {
        setStatusMessage(
          `Erreur lors du chargement des promotions : ${dealsError.message}`
        );
      }

      setProfiles((profilesData || []) as Profile[]);
      setDeals((dealsData || []) as unknown as Deal[]);
      setIsLoading(false);
    }

    loadData();
  }, []);

  function buildMessage(user: Profile | null, deal: Deal) {
    const userName = user?.full_name || "cher client";
    const storeName = deal.stores?.name || "un magasin partenaire";
    const discount = deal.discount_percentage
      ? `-${deal.discount_percentage}%`
      : "promotion spéciale";

    const validity = deal.valid_until
      ? `Offre valable jusqu’au ${formatDate(deal.valid_until)}.`
      : "Offre disponible pour une durée limitée.";

    return `Bonjour ${userName} 👋

Nouvelle offre PromoPulse chez ${storeName} :

${deal.title}
Réduction : ${discount}
${validity}

Connectez-vous à PromoPulse pour voir les détails de l’offre.`;
  }

  function updatePreview(userIds: string[], dealId: string) {
    const deal = deals.find((item) => item.id === dealId);

    if (!deal) {
      setMessagePreview("");
      return;
    }

    const firstUser = profiles.find((profile) => profile.id === userIds[0]);

    setMessagePreview(buildMessage(firstUser || null, deal));
  }

  async function loadTargetedUsers(dealId: string) {
    setStatusMessage("");
    setSelectedUserIds([]);
    setTargetedUserIds([]);
    setMessagePreview("");

    const deal = deals.find((item) => item.id === dealId);

    if (!deal) return;

    setIsTargetLoading(true);

    let storeUserIds: string[] = [];
    let categoryUserIds: string[] = [];

    if (deal.store_id) {
      const { data: userStoresData, error: userStoresError } = await supabase
        .from("user_stores")
        .select("user_id")
        .eq("store_id", deal.store_id);

      if (userStoresError) {
        setStatusMessage(
          `Erreur magasins suivis : ${userStoresError.message}`
        );
      }

      storeUserIds = ((userStoresData || []) as UserStore[]).map(
        (item) => item.user_id
      );
    }

    if (deal.category_id) {
      const { data: userCategoriesData, error: userCategoriesError } =
        await supabase
          .from("user_categories")
          .select("user_id")
          .eq("category_id", deal.category_id);

      if (userCategoriesError) {
        setStatusMessage(
          `Erreur catégories suivies : ${userCategoriesError.message}`
        );
      }

      categoryUserIds = ((userCategoriesData || []) as UserCategory[]).map(
        (item) => item.user_id
      );
    }

    const uniqueIds = Array.from(new Set([...storeUserIds, ...categoryUserIds]));

    const validTargetIds = profiles
      .filter((profile) => uniqueIds.includes(profile.id))
      .map((profile) => profile.id);

    setTargetedUserIds(validTargetIds);
    setSelectedUserIds(validTargetIds);
    updatePreview(validTargetIds, dealId);
    setIsTargetLoading(false);

    if (validTargetIds.length === 0) {
      setStatusMessage(
        "Aucun utilisateur ne suit encore le magasin ou la catégorie de cette promotion."
      );
    } else {
      setStatusMessage(
        `${validTargetIds.length} utilisateur(s) ciblé(s) automatiquement.`
      );
    }
  }

  function handleDealChange(dealId: string) {
    setSelectedDealId(dealId);
    loadTargetedUsers(dealId);
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((current) => {
      const updated = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];

      updatePreview(updated, selectedDealId);
      return updated;
    });
  }

  function selectTargetedUsers() {
    setSelectedUserIds(targetedUserIds);
    updatePreview(targetedUserIds, selectedDealId);
  }

  function selectAllUsers() {
    const allIds = profiles.map((profile) => profile.id);
    setSelectedUserIds(allIds);
    updatePreview(allIds, selectedDealId);
  }

  function clearSelection() {
    setSelectedUserIds([]);
    setMessagePreview("");
  }

  async function handleSendSimulation() {
    setStatusMessage("");

    const deal = deals.find((item) => item.id === selectedDealId);

    if (!deal) {
      setStatusMessage("Veuillez sélectionner une promotion.");
      return;
    }

    if (selectedUserIds.length === 0) {
      setStatusMessage("Veuillez sélectionner au moins un utilisateur.");
      return;
    }

    setIsSending(true);

    const payload = selectedUserIds.map((userId) => {
      const user = profiles.find((profile) => profile.id === userId);

      return {
        user_id: userId,
        deal_id: selectedDealId,
        channel: "whatsapp",
        message: buildMessage(user || null, deal),
        status: "simulated",
        sent_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase.from("notification_logs").insert(payload);

    setIsSending(false);

    if (error) {
      setStatusMessage(`Erreur : ${error.message}`);
      return;
    }

    setStatusMessage(
      `${selectedUserIds.length} notification(s) simulée(s) avec succès.`
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
        <div className="mx-auto max-w-7xl">
          <a href="/admin" className="text-sm text-emerald-300">
            ← Retour à l’administration
          </a>

          <div className="mt-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold">
                Notifications WhatsApp simulées
              </h1>
              <p className="mt-2 max-w-3xl text-slate-300">
                Sélectionnez une promotion publiée, ciblez automatiquement les
                utilisateurs intéressés, puis simulez l’envoi groupé.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-slate-400">Destinataires</p>
              <p className="mt-1 text-3xl font-bold">
                {selectedUserIds.length}
              </p>
            </div>
          </div>

          {statusMessage && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
              {statusMessage}
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                <label className="text-sm text-slate-300">
                  Promotion publiée
                </label>

                <select
                  value={selectedDealId}
                  onChange={(event) => handleDealChange(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
                >
                  <option value="">Sélectionner une promotion</option>

                  {deals.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {deal.title} — {deal.stores?.name || "Magasin"}
                    </option>
                  ))}
                </select>

                {isTargetLoading && (
                  <p className="mt-3 text-sm text-slate-400">
                    Recherche des utilisateurs ciblés...
                  </p>
                )}
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-xl font-semibold">Destinataires</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Les utilisateurs ciblés sont ceux qui suivent le magasin
                      ou la catégorie de la promotion.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={selectTargetedUsers}
                      className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/10"
                    >
                      Ciblés
                    </button>

                    <button
                      type="button"
                      onClick={selectAllUsers}
                      className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      Tous
                    </button>

                    <button
                      type="button"
                      onClick={clearSelection}
                      className="rounded-full border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-400/10"
                    >
                      Aucun
                    </button>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {profiles.map((profile) => {
                    const isSelected = selectedUserIds.includes(profile.id);
                    const isTargeted = targetedUserIds.includes(profile.id);

                    return (
                      <label
                        key={profile.id}
                        className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-400/10"
                            : "border-white/10 bg-slate-900 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUser(profile.id)}
                            className="h-4 w-4"
                          />

                          <div>
                            <p className="font-semibold">
                              {profile.full_name ||
                                profile.email ||
                                "Utilisateur"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {profile.whatsapp_number ||
                                "WhatsApp non renseigné"}
                            </p>
                          </div>
                        </div>

                        {isTargeted && (
                          <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                            ciblé
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Aperçu du message</h2>

              {messagePreview ? (
                <pre className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-900 p-5 text-sm leading-7 text-slate-200">
                  {messagePreview}
                </pre>
              ) : (
                <div className="mt-5 rounded-2xl bg-slate-900 p-5 text-slate-400">
                  Sélectionnez une promotion et des destinataires pour générer
                  l’aperçu.
                </div>
              )}

              <button
                onClick={handleSendSimulation}
                disabled={isSending || selectedUserIds.length === 0}
                className="mt-6 w-full rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
              >
                {isSending
                  ? "Simulation en cours..."
                  : `Simuler ${selectedUserIds.length} envoi(s) WhatsApp`}
              </button>

              <p className="mt-4 text-sm leading-6 text-slate-400">
                Cette action n’envoie pas encore de vrai message WhatsApp. Elle
                crée des lignes dans <span className="text-slate-200">
                  notification_logs
                </span>{" "}
                avec le statut <span className="text-slate-200">
                  simulated
                </span>.
              </p>
            </div>
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}