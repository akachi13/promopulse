"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    if (!data.user) {
      setIsLoading(false);
      setMessage("Erreur : utilisateur introuvable après connexion.");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      setIsLoading(false);
      setMessage(`Erreur profil : ${profileError.message}`);
      return;
    }

    if (!profileData) {
      const { error: createProfileError } = await supabase
        .from("profiles")
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name:
            data.user.user_metadata?.full_name ||
            data.user.email?.split("@")[0] ||
            "Utilisateur",
          role: "user",
          onboarding_completed: false,
          created_at: new Date().toISOString(),
        });

      if (createProfileError) {
        setIsLoading(false);
        setMessage(`Erreur création profil : ${createProfileError.message}`);
        return;
      }

      setIsLoading(false);
      router.replace("/onboarding");
      return;
    }

    setIsLoading(false);

    if (profileData.role === "admin") {
      router.replace("/admin");
      return;
    }

    if (profileData.onboarding_completed === false) {
      router.replace("/onboarding");
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[130px]" />
        <div className="absolute right-[-12rem] top-40 h-[26rem] w-[26rem] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-12rem] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-emerald-700/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 px-6 py-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-12">
        <section className="hidden lg:block">
          <a href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-300 font-black text-slate-950 shadow-lg shadow-emerald-500/25">
              P
            </span>

            <span className="text-2xl font-black tracking-tight">
              Promo<span className="text-emerald-400">Pulse</span>
            </span>
          </a>

          <div className="mt-20 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,.8)]" />
              Connexion sécurisée à votre espace
            </span>

            <h1 className="mt-8 text-6xl font-black leading-[1.02] tracking-tight">
              Retrouvez vos{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                meilleures offres
              </span>{" "}
              en un seul endroit.
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
              Connectez-vous pour accéder à vos promotions personnalisées, vos
              magasins suivis, vos catégories préférées et vos alertes
              PromoPulse.
            </p>

            <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                <p className="text-sm text-slate-500">Promos</p>
                <p className="mt-2 text-3xl font-black">IA</p>
                <p className="mt-1 text-xs text-slate-500">Import intelligent</p>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                <p className="text-sm text-slate-500">Alertes</p>
                <p className="mt-2 text-3xl font-black">24/7</p>
                <p className="mt-1 text-xs text-slate-500">Suivi continu</p>
              </div>

              <div className="rounded-[1.5rem] border border-emerald-400/25 bg-emerald-400/10 p-5 backdrop-blur-xl">
                <p className="text-sm text-emerald-200">Expérience</p>
                <p className="mt-2 text-3xl font-black text-emerald-300">
                  Smart
                </p>
                <p className="mt-1 text-xs text-emerald-100">
                  Personnalisée
                </p>
              </div>
            </div>

            <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-xl font-black text-slate-950">
                  ✓
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    Un parcours utilisateur déjà prêt pour la démo.
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Onboarding, abonnement, choix des magasins, choix des
                    catégories, promotions personnalisées et alertes simulées
                    sont déjà intégrés.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center lg:min-h-0">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center justify-center lg:hidden">
              <a href="/" className="inline-flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-300 font-black text-slate-950 shadow-lg shadow-emerald-500/25">
                  P
                </span>

                <span className="text-2xl font-black tracking-tight">
                  Promo<span className="text-emerald-400">Pulse</span>
                </span>
              </a>
            </div>

            <div className="relative">
              <div className="absolute -inset-1 rounded-[2.25rem] bg-gradient-to-r from-emerald-400/30 via-cyan-400/10 to-emerald-400/20 blur-2xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 shadow-2xl backdrop-blur-2xl">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-2xl">
                    🔐
                  </div>

                  <h1 className="mt-8 text-4xl font-black tracking-tight">
                    Connexion
                  </h1>

                  <p className="mt-3 leading-7 text-slate-400">
                    Accédez à votre tableau de bord et retrouvez vos promotions
                    personnalisées.
                  </p>

                  {message && (
                    <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-200">
                      {message}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="mt-8 space-y-5">
                    <div>
                      <label className="text-sm font-medium text-slate-300">
                        Adresse email
                      </label>

                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        placeholder="exemple@email.com"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-300">
                        Mot de passe
                      </label>

                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        placeholder="Votre mot de passe"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                      />
                    </div>

                    <button
                      disabled={isLoading}
                      className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-300 px-6 py-4 font-black text-slate-950 shadow-[0_12px_48px_rgba(16,185,129,.30)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_60px_rgba(16,185,129,.45)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? "Connexion..." : "Se connecter"}
                      {!isLoading && (
                        <span className="transition group-hover:translate-x-1">
                          →
                        </span>
                      )}
                    </button>
                  </form>

                  <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-center text-sm leading-6 text-slate-400">
                      Pas encore de compte ?{" "}
                      <a
                        href="/register"
                        className="font-bold text-emerald-300 transition hover:text-emerald-200"
                      >
                        Créer un compte
                      </a>
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Authentification sécurisée avec Supabase</span>
                  </div>
                </div>
              </div>
            </div>

            <a
              href="/"
              className="mt-8 inline-flex w-full justify-center text-sm font-semibold text-slate-500 transition hover:text-emerald-300"
            >
              ← Retour à l’accueil
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}