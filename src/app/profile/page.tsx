"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Profile = {
  full_name: string | null;
  email: string | null;
  whatsapp_number: string | null;
  country: string | null;
  city: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [country, setCountry] = useState("Côte d’Ivoire");
  const [city, setCity] = useState("Abidjan");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, whatsapp_number, country, city")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setMessage(`Erreur lors du chargement du profil : ${profileError.message}`);
        setIsLoading(false);
        return;
      }

      const profile = profileData as Profile | null;

      setFullName(profile?.full_name || "");
      setWhatsappNumber(profile?.whatsapp_number || "");
      setCountry(profile?.country || "Côte d’Ivoire");
      setCity(profile?.city || "Abidjan");

      setIsLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleSave() {
    if (!userId) return;

    setMessage("");
    setIsSaving(true);

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName,
        email,
        whatsapp_number: whatsappNumber,
        country,
        city,
        account_status: "active",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      setIsSaving(false);
      setMessage(`Erreur profil : ${profileError.message}`);
      return;
    }

    const { error: preferenceError } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId,
          whatsapp_number: whatsappNumber,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    setIsSaving(false);

    if (preferenceError) {
      setMessage(`Erreur préférences WhatsApp : ${preferenceError.message}`);
      return;
    }

    setMessage("Profil enregistré avec succès.");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-slate-300">Chargement du profil...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <a href="/dashboard" className="text-sm text-emerald-300">
          ← Retour au dashboard
        </a>

        <h1 className="mt-8 text-4xl font-bold">Mon profil</h1>

        <p className="mt-2 text-slate-300">
          Gérez vos informations personnelles utilisées par PromoPulse.
        </p>

        {message && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
            {message}
          </div>
        )}

        <div className="mt-8 space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <div>
            <label className="text-sm text-slate-300">Nom complet</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Votre nom complet"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Adresse email</label>
            <input
              value={email}
              disabled
              className="mt-2 w-full cursor-not-allowed rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-400 outline-none"
            />
            <p className="mt-2 text-xs text-slate-400">
              L’email est celui utilisé pour la connexion.
            </p>
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
            <p className="mt-2 text-xs text-slate-400">
              Ce numéro sera aussi synchronisé avec vos paramètres WhatsApp.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm text-slate-300">Pays</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Ville</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
          >
            {isSaving ? "Enregistrement..." : "Enregistrer mon profil"}
          </button>
        </div>
      </div>
    </main>
  );
}