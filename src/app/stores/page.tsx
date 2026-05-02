"use client";

import { useEffect, useState } from "react";
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
  plans: {
    name: string;
    max_stores: number | null;
  } | null;
};

export default function StoresPage() {
  const router = useRouter();

  const [stores, setStores] = useState<Store[]>([]);
  const [followedStoreIds, setFollowedStoreIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [maxStores, setMaxStores] = useState(0);
  const [planName, setPlanName] = useState("Aucun abonnement");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStoreId, setLoadingStoreId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadStores() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const { data: subscriptionData } = await supabase
        .from("subscriptions")
        .select(
          `
          status,
          plans(name, max_stores)
        `
        )
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const subscription = subscriptionData as unknown as Subscription | null;

      setMaxStores(subscription?.plans?.max_stores || 0);
      setPlanName(subscription?.plans?.name || "Aucun abonnement");

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

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-slate-300">Chargement des magasins...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-emerald-300">
          ← Retour au dashboard
        </a>

        <div className="mt-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-bold">Mes magasins</h1>
            <p className="mt-2 text-slate-300">
              Sélectionnez les enseignes que vous souhaitez suivre.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-slate-400">Formule actuelle</p>
              <p className="mt-1 text-xl font-bold">{planName}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-slate-400">Magasins suivis</p>
              <p className="mt-1 text-3xl font-bold">
                {followedStoreIds.length}/{maxStores}
              </p>
            </div>
          </div>
        </div>

        {maxStores <= 0 && (
          <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100">
            Aucun abonnement actif détecté. Veuillez choisir une formule avant
            de suivre des magasins.
            <a href="/subscription" className="ml-2 font-semibold underline">
              Choisir un abonnement
            </a>
          </div>
        )}

        {message && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
            {message}
          </div>
        )}

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {stores.map((store) => {
            const isFollowed = followedStoreIds.includes(store.id);
            const isCurrentLoading = loadingStoreId === store.id;
            const limitReached =
              !isFollowed && maxStores > 0 && followedStoreIds.length >= maxStores;

            return (
              <div
                key={store.id}
                className={`rounded-[2rem] border p-6 transition ${
                  isFollowed
                    ? "border-emerald-400 bg-emerald-400/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-400/20" />

                  {isFollowed && (
                    <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950">
                      Suivi
                    </span>
                  )}
                </div>

                <h2 className="mt-5 text-xl font-semibold">{store.name}</h2>

                <p className="mt-2 text-slate-300">
                  {store.description || "Promotions et offres spéciales."}
                </p>

                <p className="mt-4 text-sm text-slate-400">
                  {store.city || "Ville non renseignée"}{" "}
                  {store.country ? `— ${store.country}` : ""}
                </p>

                <button
                  onClick={() => toggleStore(store.id)}
                  disabled={isCurrentLoading || limitReached || maxStores <= 0}
                  className={`mt-6 rounded-full px-5 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isFollowed
                      ? "border border-white/20 text-white hover:bg-white/10"
                      : "bg-white text-slate-950 hover:bg-slate-200"
                  }`}
                >
                  {isCurrentLoading
                    ? "Traitement..."
                    : isFollowed
                    ? "Ne plus suivre"
                    : limitReached
                    ? "Limite atteinte"
                    : "Suivre ce magasin"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}