"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Category = {
  id: string;
  name: string;
  description: string | null;
};

type Subscription = {
  status: string | null;
  plans: {
    name: string;
    max_categories: number | null;
  } | null;
};

export default function CategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [followedCategoryIds, setFollowedCategoryIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [maxCategories, setMaxCategories] = useState(0);
  const [planName, setPlanName] = useState("Aucun abonnement");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingCategoryId, setLoadingCategoryId] = useState<string | null>(
    null
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadCategories() {
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
          plans(name, max_categories)
        `
        )
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const subscription = subscriptionData as unknown as Subscription | null;

      setMaxCategories(subscription?.plans?.max_categories || 0);
      setPlanName(subscription?.plans?.name || "Aucun abonnement");

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
            <p className="mt-2 text-slate-300">
              Sélectionnez les types d’offres qui vous intéressent.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
        </div>

        {maxCategories <= 0 && (
          <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100">
            Aucun abonnement actif détecté. Veuillez choisir une formule avant
            de suivre des catégories.
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
          {categories.map((category) => {
            const isFollowed = followedCategoryIds.includes(category.id);
            const isCurrentLoading = loadingCategoryId === category.id;
            const limitReached =
              !isFollowed &&
              maxCategories > 0 &&
              followedCategoryIds.length >= maxCategories;

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

                  {isFollowed && (
                    <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950">
                      Suivie
                    </span>
                  )}
                </div>

                <h2 className="mt-5 text-xl font-semibold">{category.name}</h2>

                <p className="mt-2 text-slate-300">
                  {category.description ||
                    "Recevoir les promotions liées à cette catégorie."}
                </p>

                <button
                  onClick={() => toggleCategory(category.id)}
                  disabled={
                    isCurrentLoading || limitReached || maxCategories <= 0
                  }
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
                    : "Suivre cette catégorie"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}