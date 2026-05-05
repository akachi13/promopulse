"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [city, setCity] = useState("Abidjan");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Erreur : les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 6) {
      setMessage("Erreur : le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          whatsapp_number: whatsappNumber,
          city,
        },
      },
    });

    if (error) {
      setIsLoading(false);
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    if (!data.user) {
      setIsLoading(false);
      setMessage(
        "Compte créé. Vérifiez votre email si une confirmation est demandée."
      );
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        email,
        full_name: fullName || email.split("@")[0],
        whatsapp_number: whatsappNumber || null,
        city: city || null,
        role: "user",
        onboarding_completed: false,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      setIsLoading(false);
      setMessage(`Erreur profil : ${profileError.message}`);
      return;
    }

    setIsLoading(false);

    if (data.session) {
      router.replace("/onboarding");
      return;
    }

    setMessage(
      "Compte créé avec succès. Vérifiez votre email si une confirmation est demandée, puis connectez-vous."
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[130px]" />
        <div className="absolute right-[-12rem] top-40 h-[26rem] w-[26rem] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-12rem] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-emerald-700/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 px-6 py-8 lg:grid-cols-[.95fr_1.05fr] lg:items-center lg:gap-12">
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
              Créez votre espace promotionnel personnalisé
            </span>

            <h1 className="mt-8 text-6xl font-black leading-[1.02] tracking-tight">
              Commencez à suivre les{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                meilleures offres
              </span>{" "}
              dès aujourd’hui.
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
              Créez votre compte, passez l’onboarding, choisissez votre formule
              puis suivez vos magasins et catégories préférés.
            </p>

            <div className="mt-10 space-y-4">
              {[
                "Onboarding guidé pour les nouveaux utilisateurs",
                "Abonnement avec limites magasins et catégories",
                "Promotions personnalisées selon vos préférences",
                "Alertes simulées prêtes pour WhatsApp Business",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 text-sm font-black text-slate-950">
                    ✓
                  </span>
                  <span className="font-semibold text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center lg:min-h-0">
          <div className="w-full max-w-xl">
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
                    ✨
                  </div>

                  <h1 className="mt-8 text-4xl font-black tracking-tight">
                    Créer un compte
                  </h1>

                  <p className="mt-3 leading-7 text-slate-400">
                    Rejoignez PromoPulse et personnalisez votre expérience de
                    suivi des promotions.
                  </p>

                  {message && (
                    <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                      {message}
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="mt-8 space-y-5">
                    <div>
                      <label className="text-sm font-medium text-slate-300">
                        Nom complet
                      </label>

                      <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        required
                        placeholder="Votre nom complet"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                      />
                    </div>

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

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-slate-300">
                          WhatsApp
                        </label>

                        <input
                          value={whatsappNumber}
                          onChange={(event) =>
                            setWhatsappNumber(event.target.value)
                          }
                          placeholder="+225 01 02 03 04 05"
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-300">
                          Ville
                        </label>

                        <input
                          value={city}
                          onChange={(event) => setCity(event.target.value)}
                          placeholder="Abidjan"
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-slate-300">
                          Mot de passe
                        </label>

                        <input
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                          placeholder="Minimum 6 caractères"
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-300">
                          Confirmation
                        </label>

                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          required
                          placeholder="Répétez le mot de passe"
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                        />
                      </div>
                    </div>

                    <button
                      disabled={isLoading}
                      className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-300 px-6 py-4 font-black text-slate-950 shadow-[0_12px_48px_rgba(16,185,129,.30)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_60px_rgba(16,185,129,.45)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? "Création..." : "Créer mon compte"}
                      {!isLoading && (
                        <span className="transition group-hover:translate-x-1">
                          →
                        </span>
                      )}
                    </button>
                  </form>

                  <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-center text-sm leading-6 text-slate-400">
                      Déjà inscrit ?{" "}
                      <a
                        href="/login"
                        className="font-bold text-emerald-300 transition hover:text-emerald-200"
                      >
                        Se connecter
                      </a>
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Inscription sécurisée avec Supabase Auth</span>
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