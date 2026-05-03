"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Category = {
  id: string;
  name: string;
  description: string | null;
};

type Subscription = {
  status: string | null;
  expires_at: string | null;
  plans: {
    name: string;
    max_categories: number | null;
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

export default function CategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [followedCategoryIds, setFollowedCategoryIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [maxCategories, setMaxCategories] = useState(0);
  const [planName, setPlanName] = useState("Aucun abonnement");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null
  );
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingCategoryId, setLoadingCategoryId] = useState<string | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  async function loadCategories() {
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
        plans(name, max_categories)
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

    setSubscriptionStatus(subscription?.status || null);
    setSubscriptionExpired(isExpired);

    if (subscription && !isExpired) {
      setMaxCategories(subscription.plans?.max_categories || 0);
      setPlanName(subscription.plans?.name || "Formule active");
    } else {
      setMaxCategories(0);
      setPlanName(
        subscription && isExpired ? "Abonnement expiré" : "Aucun abonnement"
      );
    }

    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name, description")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (categoriesError) {
      setMessage(`Erreur catégories : ${categoriesError.message}`);
    }

    const { data: userCategoriesData, error: userCategoriesError } =
      await supabase
        .from("user_categories")
        .select("category_id")
        .eq("user_id", user.id);

    if (userCategoriesError) {
      setMessage(`Erreur catégories suivies : ${userCategoriesError.message}`);
    }

    setCategories((categoriesData || []) as Category[]);
    setFollowedCategoryIds(
      (userCategoriesData || []).map((item) => item.category_id as string)
    );

    setIsLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, [router]);

  async function toggleCategory(categoryId: string) {
    if (!userId) return;

    setMessage("");
    setLoadingCategoryId(categoryId);

    const isAlreadyFollowed = followedCategoryIds.includes(categoryId);

    if (isAlreadyFollowed) {
      const { error } = await supabase
        .from("user_categories")
        .delete()
        .eq("user_id", userId)
        .eq("category_id", categoryId);

      setLoadingCategoryId(null);

      if (error) {
        setMessage(`Erreur : ${error.message}`);
        return;
      }

      setFollowedCategoryIds((current) =>
        current.filter((id) => id !== categoryId)
      );

      setMessage("Catégorie retirée de votre sélection.");
      return;
    }

    if (subscriptionExpired) {
      setLoadingCategoryId(null);
      setMessage(
        "Votre abonnement est expiré. Veuillez renouveler ou choisir une formule avant de suivre une catégorie."
      );
      return;
    }

    if (maxCategories <= 0) {
      setLoadingCategoryId(null);
      setMessage(
        "Vous devez choisir un abonnement avant de pouvoir suivre des catégories."
      );
      return;
    }

    if (followedCategoryIds.length >= maxCategories) {
      setLoadingCategoryId(null);
      setMessage(
        `Limite atteinte : votre formule ${planName} permet de suivre ${maxCategories} catégorie(s).`
      );
      return;
    }

    const { error } = await supabase.from("user_categories").insert({
      user_id: userId,
      category_id: categoryId,
    });

    setLoadingCategoryId(null);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setFollowedCategoryIds((current) => [...current, categoryId]);
    setMessage("Catégorie ajoutée à votre sélection.");
  }

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    if (!normalizedSearch) return categories;

    return categories.filter((category) => {
      return (
        category.name.toLowerCase().includes(normalizedSearch) ||
        (category.description || "")
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [categories, search]);

  const remainingCategories = Math.max(
    0,
    maxCategories - followedCategoryIds.length
  );

  const hasUsableSubscription = maxCategories > 0 && !subscriptionExpired;

  const limitReached =
    hasUsableSubscription && remainingCategories === 0;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-slate-300">Chargement des catégories...</p>
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
            <h1 className="text-4xl font-bold">Mes catégories</h1>
            <p className="mt-2 max-w-3xl text-slate-300">
              Sélectionnez les types d’offres qui vous intéressent. Vos
              promotions personnalisées dépendront aussi de ces catégories.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-slate-400">Formule actuelle</p>
              <p className="mt-1 text-xl font-bold">{planName}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-slate-400">Catégories suivies</p>
              <p className="mt-1 text-3xl font-bold">
                {followedCategoryIds.length}/{maxCategories}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-slate-400">Restantes</p>
              <p className="mt-1 text-3xl font-bold">
                {remainingCategories}
              </p>
            </div>
          </div>
        </div>

        {!hasUsableSubscription && (
          <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100">
            {subscriptionExpired
              ? "Votre abonnement est expiré. Veuillez choisir ou renouveler une formule avant de suivre des catégories."
              : "Aucun abonnement actif détecté. Veuillez choisir une formule avant de suivre des catégories."}

            <a href="/subscription" className="ml-2 font-semibold underline">
              Gérer mon abonnement
            </a>
          </div>
        )}

        {limitReached && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-5 text-red-200">
            Vous avez atteint la limite de votre formule actuelle. Retirez une
            catégorie ou changez de formule pour en suivre davantage.
            <a href="/subscription" className="ml-2 font-semibold underline">
              Changer de formule
            </a>
          </div>
        )}

        {message && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
            {message}
          </div>
        )}

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une catégorie..."
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
          />
        </div>

        {filteredCategories.length === 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
            Aucune catégorie ne correspond à votre recherche.
          </div>
        )}

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {filteredCategories.map((category) => {
            const isFollowed = followedCategoryIds.includes(category.id);
            const isCurrentLoading = loadingCategoryId === category.id;

            const cannotFollow =
              !isFollowed &&
              (!hasUsableSubscription ||
                followedCategoryIds.length >= maxCategories);

            return (
              <div
                key={category.id}
                className={`rounded-[2rem] border p-6 transition ${
                  isFollowed
                    ? "border-emerald-400 bg-emerald-400/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-400/20" />

                  {isFollowed ? (
                    <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950">
                      Suivie
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                      Disponible
                    </span>
                  )}
                </div>

                <h2 className="mt-5 text-xl font-semibold">
                  {category.name}
                </h2>

                <p className="mt-2 min-h-14 text-slate-300">
                  {category.description ||
                    "Recevoir les promotions liées à cette catégorie."}
                </p>

                <button
                  onClick={() => toggleCategory(category.id)}
                  disabled={isCurrentLoading || cannotFollow}
                  className={`mt-6 w-full rounded-full px-5 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isFollowed
                      ? "border border-white/20 text-white hover:bg-white/10"
                      : "bg-white text-slate-950 hover:bg-slate-200"
                  }`}
                >
                  {isCurrentLoading
                    ? "Traitement..."
                    : isFollowed
                    ? "Ne plus suivre"
                    : cannotFollow
                    ? "Limite atteinte"
                    : "Suivre cette catégorie"}
                </button>

                {!isFollowed && cannotFollow && (
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    Changez de formule ou retirez une catégorie pour pouvoir
                    suivre cette catégorie.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}