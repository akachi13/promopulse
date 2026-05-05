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
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-400/15 blur-[150px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:96px_96px] opacity-20" />
        </div>

        <div className="relative flex w-full max-w-md flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06] px-8 py-10 text-center shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <div className="h-14 w-14 animate-pulse rounded-2xl bg-emerald-400/30 shadow-[0_0_45px_rgba(52,211,153,0.35)]" />

          <p className="mt-8 text-lg font-medium text-slate-200">
            Préparation de votre espace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[150px]" />
        <div className="absolute right-[-14rem] top-48 h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute bottom-[-14rem] left-[-14rem] h-[34rem] w-[34rem] rounded-full bg-emerald-700/15 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-8">
        <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <section>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black tracking-tight text-white shadow-lg shadow-black/20 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-white/[0.07]"
            >
              <span>Promo</span>
              <span className="text-emerald-300">Pulse</span>
              <span className="ml-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
            </a>

            <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Configuration guidée
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Configurez votre expérience{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                en quelques secondes.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-slate-400 sm:text-lg">
              Avant d’accéder au tableau de bord, découvrez rapidement comment
              utiliser PromoPulse pour recevoir des promotions personnalisées.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07]">
                <p className="text-sm text-slate-500">Étape</p>
                <p className="mt-2 text-4xl font-black text-white">
                  {currentStep + 1}
                  <span className="text-xl text-slate-500">/{steps.length}</span>
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07]">
                <p className="text-sm text-slate-500">Durée</p>
                <p className="mt-2 text-4xl font-black text-white">1 min</p>
              </div>

              <div className="rounded-[1.75rem] border border-emerald-400/25 bg-emerald-400/10 p-5 shadow-xl shadow-emerald-950/20 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-emerald-400/15">
                <p className="text-sm text-emerald-200/80">Objectif</p>
                <p className="mt-2 text-2xl font-black text-emerald-200">
                  Personnaliser
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                <span>Progression</span>
                <span className="text-emerald-300">
                  {currentStep + 1}/{steps.length}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-300 shadow-[0_0_30px_rgba(52,211,153,0.45)] transition-all duration-500"
                  style={{
                    width: `${((currentStep + 1) / steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8 lg:p-10">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative">
              <div className="flex justify-center">
                <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 text-6xl shadow-2xl shadow-emerald-950/30">
                  <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent" />
                  <span className="relative">{step.emoji}</span>
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">
                  Découverte PromoPulse
                </p>

                <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl">
                  {step.title}
                </h2>

                <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                  {step.description}
                </p>
              </div>

              <div className="mt-8 grid gap-3">
                {steps.map((item, index) => (
                  <button
                    key={item.title}
                    onClick={() => setCurrentStep(index)}
                    className={`group flex items-center gap-4 rounded-[1.5rem] border p-4 text-left backdrop-blur-xl transition hover:-translate-y-0.5 ${
                      index === currentStep
                        ? "border-emerald-400/35 bg-emerald-400/10 shadow-lg shadow-emerald-950/20"
                        : "border-white/10 bg-slate-950/40 hover:border-emerald-400/25 hover:bg-white/[0.06]"
                    }`}
                    aria-label={`Aller à l'étape ${index + 1}`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${
                        index === currentStep
                          ? "bg-emerald-400 text-slate-950"
                          : "border border-white/10 bg-white/[0.04] text-slate-300"
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-bold ${
                          index === currentStep ? "text-emerald-200" : "text-slate-200"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {item.description}
                      </p>
                    </div>

                    <span
                      className={`text-sm transition ${
                        index === currentStep
                          ? "text-emerald-300"
                          : "text-slate-600 group-hover:text-emerald-300"
                      }`}
                    >
                      →
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-center gap-2">
                {steps.map((item, index) => (
                  <button
                    key={item.title}
                    onClick={() => setCurrentStep(index)}
                    className={`h-3 rounded-full transition ${
                      index === currentStep
                        ? "w-10 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.65)]"
                        : "w-3 bg-white/20 hover:bg-white/40"
                    }`}
                    aria-label={`Aller à l'étape ${index + 1}`}
                  />
                ))}
              </div>

              {message && (
                <div className="mt-8 rounded-[1.5rem] border border-red-400/25 bg-red-400/10 p-4 text-sm font-medium text-red-200 shadow-lg shadow-red-950/20 backdrop-blur-xl">
                  {message}
                </div>
              )}

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep((current) => current - 1)}
                  className="flex-1 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 font-bold text-white transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  Précédent
                </button>

                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((current) => current + 1)}
                    className="group relative flex-1 overflow-hidden rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-300 px-6 py-3.5 font-black text-slate-950 shadow-2xl shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:shadow-emerald-400/20"
                  >
                    <span className="absolute inset-0 translate-y-full bg-white/30 transition group-hover:translate-y-0" />
                    <span className="relative">Suivant</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={finishOnboarding}
                    disabled={isFinishing}
                    className="group relative flex-1 overflow-hidden rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-300 px-6 py-3.5 font-black text-slate-950 shadow-2xl shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:shadow-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="absolute inset-0 translate-y-full bg-white/30 transition group-hover:translate-y-0" />
                    <span className="relative">
                      {isFinishing
                        ? "Finalisation..."
                        : "Terminer et choisir mon abonnement"}
                    </span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={finishOnboarding}
                disabled={isFinishing}
                className="mt-5 w-full rounded-full px-6 py-3 text-sm font-bold text-slate-400 transition hover:bg-white/[0.04] hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Passer l’introduction
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}