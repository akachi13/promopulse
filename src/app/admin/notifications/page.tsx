"use client";

import { useEffect, useMemo, useState } from "react";
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

function getDiscountLabel(value: number | null) {
  if (!value) return "Offre spéciale";
  return `-${value}%`;
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

  const selectedDeal = useMemo(() => {
    return deals.find((deal) => deal.id === selectedDealId) || null;
  }, [deals, selectedDealId]);

  const targetedProfiles = useMemo(() => {
    return profiles.filter((profile) => targetedUserIds.includes(profile.id));
  }, [profiles, targetedUserIds]);

  const selectedProfiles = useMemo(() => {
    return profiles.filter((profile) => selectedUserIds.includes(profile.id));
  }, [profiles, selectedUserIds]);

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
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6 text-white">
          <div className="pointer-events-none fixed inset-0">
            <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[130px]" />
            <div className="absolute bottom-[-12rem] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-emerald-700/15 blur-[120px]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
          </div>

          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 text-center shadow-2xl backdrop-blur-2xl">
            <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-emerald-400/30" />
            <p className="mt-5 text-slate-300">
              Chargement des notifications...
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
              <a
                href="/admin/deals"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                🔥 Promotions
              </a>

              <a
                href="/admin/notification-logs"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                🧾 Historique
              </a>

              <button
                onClick={handleSendSimulation}
                disabled={isSending || selectedUserIds.length === 0}
                className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending
                  ? "Simulation..."
                  : `Simuler ${selectedUserIds.length} envoi(s)`}
              </button>
            </div>
          </header>

          {statusMessage && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-slate-200 backdrop-blur-xl">
              {statusMessage}
            </div>
          )}

          <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-2xl backdrop-blur-2xl md:p-9">
              <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,.8)]" />
                  Simulation WhatsApp ciblée
                </span>

                <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Envoyez les bonnes{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                    alertes
                  </span>{" "}
                  aux bons utilisateurs.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Sélectionnez une promotion publiée, ciblez automatiquement les
                  utilisateurs qui suivent le magasin ou la catégorie, puis
                  simulez l’envoi WhatsApp.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Promotions publiées</p>
                    <p className="mt-2 text-4xl font-black">{deals.length}</p>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <p className="text-sm text-emerald-200">Ciblés</p>
                    <p className="mt-2 text-4xl font-black text-emerald-300">
                      {targetedUserIds.length}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-cyan-400/25 bg-cyan-400/10 p-5">
                    <p className="text-sm text-cyan-200">Sélectionnés</p>
                    <p className="mt-2 text-4xl font-black text-cyan-300">
                      {selectedUserIds.length}
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
                    Promotion sélectionnée
                  </p>

                  {selectedDeal ? (
                    <>
                      <h2 className="mt-4 text-3xl font-black">
                        {selectedDeal.title}
                      </h2>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                          {getDiscountLabel(selectedDeal.discount_percentage)}
                        </span>

                        <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">
                          {selectedDeal.stores?.name || "Magasin partenaire"}
                        </span>
                      </div>

                      <p className="mt-5 text-sm leading-6 text-emerald-100">
                        Validité :{" "}
                        <span className="font-bold text-white">
                          {formatDate(selectedDeal.valid_until)}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-4 text-3xl font-black">
                        Aucune promotion choisie
                      </h2>

                      <p className="mt-4 leading-7 text-emerald-100">
                        Sélectionnez une promotion publiée pour générer les
                        destinataires et l’aperçu du message.
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                  <p className="text-sm font-bold text-white">
                    Mode simulation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    Aucun vrai message WhatsApp n’est envoyé. Les lignes sont
                    enregistrées dans notification_logs avec le statut simulated.
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <label className="text-sm font-semibold text-slate-300">
              Promotion publiée
            </label>

            <select
              value={selectedDealId}
              onChange={(event) => handleDealChange(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
            >
              <option value="">Sélectionner une promotion</option>

              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.title} — {deal.stores?.name || "Magasin"}
                </option>
              ))}
            </select>

            {isTargetLoading && (
              <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-300">
                Recherche des utilisateurs ciblés...
              </div>
            )}
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_.9fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                    Destinataires
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    Utilisateurs à notifier
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Les utilisateurs ciblés suivent le magasin ou la catégorie
                    de la promotion sélectionnée.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={selectTargetedUsers}
                    className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/20"
                  >
                    Ciblés
                  </button>

                  <button
                    type="button"
                    onClick={selectAllUsers}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.08]"
                  >
                    Tous
                  </button>

                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-full border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400/20"
                  >
                    Aucun
                  </button>
                </div>
              </div>

              {targetedProfiles.length > 0 && (
                <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <p className="text-sm font-bold text-emerald-300">
                    Ciblage automatique
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {targetedProfiles.slice(0, 8).map((profile) => (
                      <span
                        key={profile.id}
                        className="rounded-full border border-emerald-300/25 bg-slate-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-100"
                      >
                        {profile.full_name || profile.email || "Utilisateur"}
                      </span>
                    ))}

                    {targetedProfiles.length > 8 && (
                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-950">
                        +{targetedProfiles.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {profiles.map((profile) => {
                  const isSelected = selectedUserIds.includes(profile.id);
                  const isTargeted = targetedUserIds.includes(profile.id);

                  return (
                    <label
                      key={profile.id}
                      className={`group flex cursor-pointer items-center justify-between gap-4 rounded-3xl border p-4 transition hover:-translate-y-0.5 ${
                        isSelected
                          ? "border-emerald-400/40 bg-emerald-400/10"
                          : "border-white/10 bg-slate-950/50 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUser(profile.id)}
                          className="h-4 w-4"
                        />

                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-black text-emerald-300">
                          {(profile.full_name ||
                            profile.email ||
                            "U")
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>

                        <div>
                          <p className="font-bold">
                            {profile.full_name ||
                              profile.email ||
                              "Utilisateur"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {profile.whatsapp_number ||
                              "WhatsApp non renseigné"}
                          </p>

                          {profile.email && (
                            <p className="mt-1 text-xs text-slate-600">
                              {profile.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {isTargeted && (
                          <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-slate-950">
                            ciblé
                          </span>
                        )}

                        {isSelected && (
                          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                            sélectionné
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <aside className="sticky top-6 h-fit rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                    Aperçu WhatsApp
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    Message simulé
                  </h2>
                </div>

                <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-slate-950">
                  WhatsApp
                </span>
              </div>

              <div className="mt-6 rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
                <div className="rounded-[1.5rem] bg-slate-950/70 p-4">
                  {messagePreview ? (
                    <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                      {messagePreview}
                    </pre>
                  ) : (
                    <p className="text-sm leading-7 text-slate-400">
                      Sélectionnez une promotion et des destinataires pour
                      générer l’aperçu du message.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-500">Sélectionnés</p>
                  <p className="mt-1 text-3xl font-black">
                    {selectedUserIds.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-500">Ciblés</p>
                  <p className="mt-1 text-3xl font-black">
                    {targetedUserIds.length}
                  </p>
                </div>
              </div>

              {selectedProfiles.length > 0 && (
                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    Premiers destinataires
                  </p>

                  <div className="mt-3 space-y-2">
                    {selectedProfiles.slice(0, 4).map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate text-slate-300">
                          {profile.full_name || profile.email || "Utilisateur"}
                        </span>

                        <span className="shrink-0 text-xs text-emerald-300">
                          WhatsApp
                        </span>
                      </div>
                    ))}

                    {selectedProfiles.length > 4 && (
                      <p className="text-xs text-slate-500">
                        +{selectedProfiles.length - 4} autre(s)
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleSendSimulation}
                disabled={isSending || selectedUserIds.length === 0}
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-300 px-6 py-4 font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending
                  ? "Simulation en cours..."
                  : `Simuler ${selectedUserIds.length} envoi(s) WhatsApp`}
              </button>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                Cette action n’envoie pas encore de vrai message WhatsApp. Elle
                crée des lignes dans{" "}
                <span className="font-semibold text-slate-300">
                  notification_logs
                </span>{" "}
                avec le statut{" "}
                <span className="font-semibold text-slate-300">simulated</span>.
              </p>
            </aside>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}