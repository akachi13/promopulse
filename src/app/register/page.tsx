"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          whatsapp_number: whatsappNumber,
        },
      },
    });

    if (error) {
      setIsLoading(false);
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        email,
        whatsapp_number: whatsappNumber,
        role: "user",
        account_status: "active",
      });

      await supabase.from("notification_preferences").insert({
        user_id: data.user.id,
        whatsapp_number: whatsappNumber,
        is_enabled: true,
        frequency: "daily",
      });
    }

    setIsLoading(false);
    setMessage(
      "Compte créé avec succès. Vérifiez votre email si Supabase demande une confirmation, puis connectez-vous."
    );

    setFullName("");
    setEmail("");
    setWhatsappNumber("");
    setPassword("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <a href="/" className="text-xl font-bold">
          Promo<span className="text-emerald-400">Pulse</span>
        </a>

        <h1 className="mt-8 text-3xl font-bold">Créer un compte</h1>
        <p className="mt-2 text-slate-300">
          Configurez votre compte pour suivre vos magasins préférés.
        </p>

        {message && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            {message}
          </div>
        )}

        <form onSubmit={handleRegister} className="mt-8 space-y-5">
          <div>
            <label className="text-sm text-slate-300">Nom complet</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Votre nom"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Adresse email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="exemple@email.com"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Numéro WhatsApp</label>
            <input
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+225 07 00 00 00 00"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Créer un mot de passe"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            />
          </div>

          <button
            disabled={isLoading}
            className="w-full rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
          >
            {isLoading ? "Création en cours..." : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-300">
          Déjà inscrit ?{" "}
          <a href="/login" className="font-semibold text-emerald-300">
            Se connecter
          </a>
        </p>
      </div>
    </main>
  );
}