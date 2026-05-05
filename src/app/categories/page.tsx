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

function getCategoryIcon(index: number) {
  const icons = ["🏷️", "🛒", "🍽️", "📱", "👗", "🏠", "💄", "⚡", "🎁", "🧴"];
  return icons[index % icons.length];
}

export default function CategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [followedCategoryIds, setFollowedCategoryIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [maxCategories, setMaxCategories] = useState(0);
  const [planName, setPlanName] = useState("Aucun abonnement");
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

  const followedCategories = useMemo(() => {
    return categories.filter((category) =>
      followedCategoryIds.includes(category.id)
    );
  }, [categories, followedCategoryIds]);

  const remainingCategories = Math.max(
    0,
    maxCategories - followedCategoryIds.length
  );

  const hasUsableSubscription = maxCategories > 0 && !subscriptionExpired;

  const limitReached =
    hasUsableSubscription && remainingCategories === 0;

  const progress =
    maxCategories > 0
      ? Math.min(100, (followedCategoryIds.length / maxCategories) * 100)
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
          <p className="mt-5 text-slate-300">Chargement des catégories...</p>
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
              href="/stores"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              🏬 Magasins
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
                Préférences catégories
              </span>

              <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                Personnalisez vos{" "}
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                  centres d’intérêt
                </span>
                .
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                Les catégories suivies permettent à PromoPulse de mieux
                sélectionner les promotions qui correspondent à vos besoins.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Formule actuelle</p>
                  <p className="mt-2 truncate text-xl font-black">{planName}</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-sm text-slate-500">Catégories suivies</p>
                  <p className="mt-2 text-4xl font-black">
                    {followedCategoryIds.length}/{maxCategories}
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                  <p className="text-sm text-emerald-200">Restantes</p>
                  <p className="mt-2 text-4xl font-black text-emerald-300">
                    {remainingCategories}
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
                {followedCategoryIds.length}/{maxCategories} catégorie(s)
              </h2>

              <p className="mt-4 leading-7 text-emerald-100">
                Votre formule actuelle définit le nombre de catégories que vous
                pouvez suivre. Plus vos choix sont précis, plus vos promotions
                seront pertinentes.
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
              ? "Votre abonnement est expiré. Veuillez choisir ou renouveler une formule avant de suivre des catégories."
              : "Aucun abonnement actif détecté. Veuillez choisir une formule avant de suivre des catégories."}

            <a href="/subscription" className="ml-2 font-black underline">
              Gérer mon abonnement
            </a>
          </div>
        )}

        {limitReached && (
          <div className="mt-8 rounded-[2rem] border border-red-400/30 bg-red-400/10 p-5 text-red-200 backdrop-blur-xl">
            Vous avez atteint la limite de votre formule actuelle. Retirez une
            catégorie ou changez de formule pour en suivre davantage.
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
                placeholder="Rechercher une catégorie..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-12 py-4 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
              />
            </div>

            <button
              onClick={loadCategories}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-bold text-white transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              Actualiser
            </button>
          </div>
        </section>

        {followedCategories.length > 0 && (
          <section className="mt-8 rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6 backdrop-blur-xl">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                  Sélection actuelle
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  Vos catégories suivies
                </h2>
              </div>

              <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                {followedCategories.length} active(s)
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {followedCategories.map((category, index) => (
                <span
                  key={category.id}
                  className="rounded-full border border-emerald-300/25 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-emerald-100"
                >
                  {getCategoryIcon(index)} {category.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {filteredCategories.length === 0 && (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-3xl">
              🧭
            </div>

            <h2 className="mt-6 text-2xl font-black">
              Aucune catégorie trouvée
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
              Essayez une autre recherche ou vérifiez que des catégories actives
              existent côté administration.
            </p>
          </section>
        )}

        {filteredCategories.length > 0 && (
          <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredCategories.map((category, index) => {
              const isFollowed = followedCategoryIds.includes(category.id);
              const isCurrentLoading = loadingCategoryId === category.id;

              const cannotFollow =
                !isFollowed &&
                (!hasUsableSubscription ||
                  followedCategoryIds.length >= maxCategories);

              const icon = getCategoryIcon(index);

              return (
                <article
                  key={category.id}
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
                        className={`flex h-16 w-16 items-center justify-center rounded-3xl text-3xl ${
                          isFollowed
                            ? "bg-emerald-400 text-slate-950"
                            : "border border-white/10 bg-white/[0.05]"
                        }`}
                      >
                        {icon}
                      </div>

                      {isFollowed ? (
                        <span className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950">
                          Suivie
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-300">
                          Disponible
                        </span>
                      )}
                    </div>

                    <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
                      Catégorie #{index + 1}
                    </p>

                    <h2 className="mt-3 text-2xl font-black">
                      {category.name}
                    </h2>

                    <p className="mt-3 min-h-20 leading-7 text-slate-400">
                      {category.description ||
                        "Recevoir les promotions liées à cette catégorie."}
                    </p>

                    <button
                      onClick={() => toggleCategory(category.id)}
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
                        : "Suivre cette catégorie"}
                    </button>

                    {!isFollowed && cannotFollow && (
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        Changez de formule ou retirez une catégorie pour pouvoir
                        suivre cette catégorie.
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