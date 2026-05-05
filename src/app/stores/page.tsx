"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Store = {
  id: string;
  name: string;
  description: string | null;
  country: string | null;
  city: string | null;
};

type Subscription = {
  status: string | null;
  expires_at: string | null;
  plans: {
    name: string;
    max_stores: number | null;
  } | null;
};

function isSubscriptionExpired(expiresAt: string | null) {
  if (!expiresAt) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(expiresAt);
  expiryDate.setHours(0, 0, 0, 0);

  return expiryDate < today;
}

export default function StoresPage() {
  const router = useRouter();

  const [stores, setStores] = useState<Store[]>([]);
  const [followedStoreIds, setFollowedStoreIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [maxStores, setMaxStores] = useState(0);
  const [planName, setPlanName] = useState("Aucun abonnement");
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStoreId, setLoadingStoreId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  async function loadStores() {
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

    setUserId(user.id);

    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select(
        `
        status,
        expires_at,
        plans(name, max_stores)
      `
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      setMessage(`Erreur abonnement : ${subscriptionError.message}`);
    }

    const subscription = subscriptionData as unknown as Subscription | null;
    const isExpired = isSubscriptionExpired(subscription?.expires_at || null);

    setSubscriptionExpired(isExpired);

    if (subscription && !isExpired) {
      setMaxStores(subscription.plans?.max_stores || 0);
      setPlanName(subscription.plans?.name || "Formule active");
    } else {
      setMaxStores(0);
      setPlanName(
        subscription && isExpired ? "Abonnement expiré" : "Aucun abonnement"
      );
    }

    const { data: storesData, error: storesError } = await supabase
      .from("stores")
      .select("id, name, description, country, city")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (storesError) {
      setMessage(`Erreur magasins : ${storesError.message}`);
    }

    const { data: userStoresData, error: userStoresError } = await supabase
      .from("user_stores")
      .select("store_id")
      .eq("user_id", user.id);

    if (userStoresError) {
      setMessage(`Erreur magasins suivis : ${userStoresError.message}`);
    }

    setStores((storesData || []) as Store[]);
    setFollowedStoreIds(
      (userStoresData || []).map((item) => item.store_id as string)
    );

    setIsLoading(false);
  }

  useEffect(() => {
    loadStores();
  }, [router]);

  async function toggleStore(storeId: string) {
    if (!userId) return;

    setMessage("");
    setLoadingStoreId(storeId);

    const isAlreadyFollowed = followedStoreIds.includes(storeId);

    if (isAlreadyFollowed) {
      const { error } = await supabase
        .from("user_stores")
        .delete()
        .eq("user_id", userId)
        .eq("store_id", storeId);

      setLoadingStoreId(null);

      if (error) {
        setMessage(`Erreur : ${error.message}`);
        return;
      }

      setFollowedStoreIds((current) => current.filter((id) => id !== storeId));
      setMessage("Magasin retiré de votre sélection.");
      return;
    }

    if (subscriptionExpired) {
      setLoadingStoreId(null);
      setMessage(
        "Votre abonnement est expiré. Veuillez renouveler ou choisir une formule avant de suivre un magasin."
      );
      return;
    }

    if (maxStores <= 0) {
      setLoadingStoreId(null);
      setMessage(
        "Vous devez choisir un abonnement avant de pouvoir suivre des magasins."
      );
      return;
    }

    if (followedStoreIds.length >= maxStores) {
      setLoadingStoreId(null);
      setMessage(
        `Limite atteinte : votre formule ${planName} permet de suivre ${maxStores} magasin(s).`
      );
      return;
    }

    const { error } = await supabase.from("user_stores").insert({
      user_id: userId,
      store_id: storeId,
    });

    setLoadingStoreId(null);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setFollowedStoreIds((current) => [...current, storeId]);
    setMessage("Magasin ajouté à votre sélection.");
  }

  const filteredStores = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    if (!normalizedSearch) return stores;

    return stores.filter((store) => {
      return (
        store.name.toLowerCase().includes(normalizedSearch) ||
        (store.description || "").toLowerCase().includes(normalizedSearch) ||
        (store.city || "").toLowerCase().includes(normalizedSearch) ||
        (store.country || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [stores, search]);

  const followedStores = useMemo(() => {
    return stores.filter((store) => followedStoreIds.includes(store.id));
  }, [stores, followedStoreIds]);

  const remainingStores = Math.max(0, maxStores - followedStoreIds.length);
  const hasUsableSubscription = maxStores > 0 && !subscriptionExpired;
  const limitReached = hasUsableSubscription && remainingStores === 0;

  const progress =
    maxStores > 0
      ? Math.min(100, (followedStoreIds.length / maxStores) * 100)
      : 0;

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
          <p className="mt-5 text-slate-300">Chargement des magasins...</p>
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
            <a
              href="/deals"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              🔥 Promotions
            </a>

            <a
              href="/categories"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              🏷️ Catégories
            </a>

            <a
              href="/subscription"
              className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
            >
              💳 Abonnement
            </a>
          </div>
        </header>

        {message && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-slate-200 backdrop-blur-xl">
            {message}
          </div>
        )}

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-2xl backdrop-blur-2xl md:p-9">
            <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,.8)]" />
                Préférences magasins
              </span>

              <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                Suivez vos{" "}
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                  enseignes
                </span>{" "}
                favorites.
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                Les magasins que vous suivez déterminent les promotions qui
                remontent dans votre dashboard et dans vos recommandations.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Formule actuelle</p>
                  <p className="mt-2 truncate text-xl font-black">{planName}</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Magasins suivis</p>
                  <p className="mt-2 text-4xl font-black">
                    {followedStoreIds.length}/{maxStores}
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                  <p className="text-sm text-emerald-200">Restants</p>
                  <p className="mt-2 text-4xl font-black text-emerald-300">
                    {remainingStores}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-7 shadow-2xl shadow-emerald-950/30 backdrop-blur-2xl">
            <div className="absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-emerald-300/20 blur-3xl" />

            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                Limite du plan
              </p>

              <h2 className="mt-4 text-3xl font-black">
                {followedStoreIds.length}/{maxStores} magasin(s)
              </h2>

              <p className="mt-4 leading-7 text-emerald-100">
                Votre formule actuelle permet de suivre un nombre limité de
                magasins. Changez de formule pour élargir vos préférences.
              </p>

              <div className="mt-7">
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-100">Progression</span>
                  <span className="font-bold text-white">
                    {Math.round(progress)}%
                  </span>
                </div>

                <div className="mt-3 h-3 rounded-full bg-slate-950/40">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-emerald-300 to-teal-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <a
                href="/subscription"
                className="mt-7 inline-flex w-full justify-center rounded-2xl bg-white px-6 py-4 font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                Changer de formule
              </a>
            </div>
          </aside>
        </section>

        {!hasUsableSubscription && (
          <div className="mt-8 rounded-[2rem] border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100 backdrop-blur-xl">
            {subscriptionExpired
              ? "Votre abonnement est expiré. Veuillez choisir ou renouveler une formule avant de suivre des magasins."
              : "Aucun abonnement actif détecté. Veuillez choisir une formule avant de suivre des magasins."}

            <a href="/subscription" className="ml-2 font-black underline">
              Gérer mon abonnement
            </a>
          </div>
        )}

        {limitReached && (
          <div className="mt-8 rounded-[2rem] border border-red-400/30 bg-red-400/10 p-5 text-red-200 backdrop-blur-xl">
            Vous avez atteint la limite de votre formule actuelle. Retirez un
            magasin ou changez de formule pour en suivre davantage.
            <a href="/subscription" className="ml-2 font-black underline">
              Changer de formule
            </a>
          </div>
        )}

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                🔍
              </span>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un magasin, une ville ou un pays..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-12 py-4 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
              />
            </div>

            <button
              onClick={loadStores}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-bold text-white transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              Actualiser
            </button>
          </div>
        </section>

        {followedStores.length > 0 && (
          <section className="mt-8 rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6 backdrop-blur-xl">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                  Sélection actuelle
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  Vos magasins suivis
                </h2>
              </div>

              <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                {followedStores.length} actif(s)
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {followedStores.map((store) => (
                <span
                  key={store.id}
                  className="rounded-full border border-emerald-300/25 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-emerald-100"
                >
                  {store.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {filteredStores.length === 0 && (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-3xl">
              🧭
            </div>

            <h2 className="mt-6 text-2xl font-black">
              Aucun magasin trouvé
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
              Essayez une autre recherche ou vérifiez que des magasins actifs
              existent côté administration.
            </p>
          </section>
        )}

        {filteredStores.length > 0 && (
          <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredStores.map((store, index) => {
              const isFollowed = followedStoreIds.includes(store.id);
              const isCurrentLoading = loadingStoreId === store.id;

              const cannotFollow =
                !isFollowed &&
                (!hasUsableSubscription ||
                  followedStoreIds.length >= maxStores);

              return (
                <article
                  key={store.id}
                  className={`group relative overflow-hidden rounded-[2rem] border p-6 shadow-xl backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/30 ${
                    isFollowed
                      ? "border-emerald-400/35 bg-emerald-400/10"
                      : "border-white/10 bg-white/[0.04] hover:border-emerald-400/30 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-emerald-400/10 blur-3xl opacity-0 transition group-hover:opacity-100" />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-3xl text-2xl font-black ${
                          isFollowed
                            ? "bg-emerald-400 text-slate-950"
                            : "border border-white/10 bg-white/[0.05]"
                        }`}
                      >
                        {store.name.slice(0, 1).toUpperCase()}
                      </div>

                      {isFollowed ? (
                        <span className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950">
                          Suivi
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-300">
                          Disponible
                        </span>
                      )}
                    </div>

                    <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
                      Magasin #{index + 1}
                    </p>

                    <h2 className="mt-3 text-2xl font-black">{store.name}</h2>

                    <p className="mt-3 min-h-20 leading-7 text-slate-400">
                      {store.description || "Promotions et offres spéciales."}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {store.city && (
                        <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1.5 text-xs font-semibold text-slate-300">
                          📍 {store.city}
                        </span>
                      )}

                      {store.country && (
                        <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1.5 text-xs font-semibold text-slate-300">
                          🌍 {store.country}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => toggleStore(store.id)}
                      disabled={isCurrentLoading || cannotFollow}
                      className={`mt-7 w-full rounded-2xl px-5 py-4 font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isFollowed
                          ? "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                          : cannotFollow
                          ? "border border-slate-700 bg-slate-900 text-slate-500"
                          : "bg-gradient-to-r from-emerald-500 to-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5"
                      }`}
                    >
                      {isCurrentLoading
                        ? "Traitement..."
                        : isFollowed
                        ? "Ne plus suivre"
                        : cannotFollow
                        ? "Limite atteinte"
                        : "Suivre ce magasin"}
                    </button>

                    {!isFollowed && cannotFollow && (
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        Changez de formule ou retirez un magasin pour pouvoir
                        suivre cette enseigne.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}