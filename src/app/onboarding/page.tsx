"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const steps = [
  {
    title: "Bienvenue sur PromoPulse",
    description:
      "PromoPulse vous aide à suivre les meilleures promotions de vos magasins préférés et à recevoir des alertes personnalisées.",
    emoji: "👋",
  },
  {
    title: "Choisissez votre abonnement",
    description:
      "Votre abonnement détermine le nombre de magasins et de catégories que vous pouvez suivre.",
    emoji: "💳",
  },
  {
    title: "Suivez vos magasins préférés",
    description:
      "Sélectionnez les enseignes qui vous intéressent afin de recevoir des promotions pertinentes.",
    emoji: "🏬",
  },
  {
    title: "Choisissez vos catégories",
    description:
      "Alimentation, beauté, électroménager, mode ou santé : vos catégories permettent de personnaliser vos offres.",
    emoji: "🏷️",
  },
  {
    title: "Recevez vos alertes",
    description:
      "Lorsque l’admin publie une promotion qui correspond à vos préférences, elle apparaît dans vos alertes.",
    emoji: "🔔",
  },
];

export default function OnboardingPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        router.push("/dashboard");
        return;
      }

      setIsLoading(false);
    }

    checkUser();
  }, [router]);

  async function finishOnboarding() {
    if (!userId) return;

    setMessage("");
    setIsFinishing(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setIsFinishing(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    router.push("/subscription");
  }

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-slate-300">Préparation de votre espace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <section>
            <a href="/" className="text-xl font-bold">
              Promo<span className="text-emerald-400">Pulse</span>
            </a>

            <h1 className="mt-10 text-5xl font-bold leading-tight">
              Configurez votre expérience en quelques secondes.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Avant d’accéder au tableau de bord, découvrez rapidement comment
              utiliser PromoPulse pour recevoir des promotions personnalisées.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Étape</p>
                <p className="mt-2 text-3xl font-bold">
                  {currentStep + 1}/{steps.length}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Durée</p>
                <p className="mt-2 text-3xl font-bold">1 min</p>
              </div>

              <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5">
                <p className="text-sm text-emerald-200">Objectif</p>
                <p className="mt-2 text-xl font-bold">Personnaliser</p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl">
            <div className="flex justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-400/20 text-5xl">
                {step.emoji}
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Découverte PromoPulse
              </p>

              <h2 className="mt-4 text-3xl font-bold">{step.title}</h2>

              <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-300">
                {step.description}
              </p>
            </div>

            <div className="mt-8 flex justify-center gap-2">
              {steps.map((item, index) => (
                <button
                  key={item.title}
                  onClick={() => setCurrentStep(index)}
                  className={`h-3 rounded-full transition ${
                    index === currentStep
                      ? "w-10 bg-emerald-400"
                      : "w-3 bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Aller à l'étape ${index + 1}`}
                />
              ))}
            </div>

            {message && (
              <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
                {message}
              </div>
            )}

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={currentStep === 0}
                onClick={() => setCurrentStep((current) => current - 1)}
                className="flex-1 rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Précédent
              </button>

              {!isLastStep ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((current) => current + 1)}
                  className="flex-1 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  Suivant
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishOnboarding}
                  disabled={isFinishing}
                  className="flex-1 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                >
                  {isFinishing
                    ? "Finalisation..."
                    : "Terminer et choisir mon abonnement"}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={finishOnboarding}
              disabled={isFinishing}
              className="mt-4 w-full text-sm font-semibold text-slate-400 transition hover:text-emerald-300 disabled:opacity-60"
            >
              Passer l’introduction
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}