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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <a href="/" className="text-xl font-bold">
          Promo<span className="text-emerald-400">Pulse</span>
        </a>

        <h1 className="mt-8 text-3xl font-bold">Connexion</h1>

        <p className="mt-2 text-slate-300">
          Connectez-vous pour accéder à vos promotions personnalisées.
        </p>

        {message && (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label className="text-sm text-slate-300">Adresse email</label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="exemple@email.com"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Mot de passe</label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="Votre mot de passe"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            />
          </div>

          <button
            disabled={isLoading}
            className="w-full rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
          >
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-300">
          Pas encore de compte ?{" "}
          <a href="/register" className="font-semibold text-emerald-300">
            Créer un compte
          </a>
        </p>
      </div>
    </main>
  );
}