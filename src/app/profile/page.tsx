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
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-400/15 blur-[150px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:96px_96px] opacity-20" />
        </div>

        <div className="relative flex w-full max-w-md flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06] px-8 py-10 text-center shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <div className="h-14 w-14 animate-pulse rounded-2xl bg-emerald-400/30 shadow-[0_0_45px_rgba(52,211,153,0.35)]" />

          <p className="mt-8 text-lg font-medium text-slate-200">
            Chargement de votre profil...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] px-6 py-8 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[140px]" />
        <div className="absolute left-0 top-1/3 h-80 w-80 rounded-full bg-cyan-400/10 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-teal-400/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/dashboard"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-300 shadow-lg shadow-black/20 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-white/[0.07] hover:text-emerald-300"
          >
            <span>←</span>
            <span>Retour au dashboard</span>
          </a>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
            Compte actif
          </div>
        </div>

        <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  <span>Profil utilisateur</span>
                </div>

                <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Gérez votre identité{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                    PromoPulse
                  </span>
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  Mettez à jour vos informations personnelles, votre localisation et votre numéro
                  WhatsApp utilisé pour recevoir les alertes de promotions.
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-black/30">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-300 to-cyan-300 text-2xl font-black text-slate-950 shadow-lg shadow-emerald-400/20">
                    {(fullName || email || "P").charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-white">
                      {fullName || "Utilisateur PromoPulse"}
                    </p>
                    <p className="truncate text-sm text-slate-400">{email}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Localisation
                    </p>
                    <p className="mt-2 font-semibold text-slate-100">
                      {city || "Ville non renseignée"}, {country || "Pays non renseigné"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      WhatsApp
                    </p>
                    <p className="mt-2 font-semibold text-slate-100">
                      {whatsappNumber || "Numéro non renseigné"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl">
              ✓
            </div>
            <p className="mt-4 text-sm text-slate-400">Statut du compte</p>
            <p className="mt-1 text-xl font-bold text-white">Actif</p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl">
              ✉
            </div>
            <p className="mt-4 text-sm text-slate-400">Email de connexion</p>
            <p className="mt-1 truncate text-xl font-bold text-white">{email || "Non défini"}</p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-400/10 text-xl">
              ☎
            </div>
            <p className="mt-4 text-sm text-slate-400">Alertes WhatsApp</p>
            <p className="mt-1 text-xl font-bold text-white">
              {whatsappNumber ? "Configurées" : "À compléter"}
            </p>
          </div>
        </section>

        {message && (
          <div
            className={`mt-8 rounded-[2rem] border p-5 shadow-2xl backdrop-blur-xl ${
              message.toLowerCase().includes("erreur")
                ? "border-red-400/20 bg-red-400/10 text-red-100 shadow-red-950/20"
                : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100 shadow-emerald-950/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  message.toLowerCase().includes("erreur")
                    ? "bg-red-400/20 text-red-200"
                    : "bg-emerald-400/20 text-emerald-200"
                }`}
              >
                {message.toLowerCase().includes("erreur") ? "!" : "✓"}
              </div>

              <div>
                <p className="font-semibold">
                  {message.toLowerCase().includes("erreur")
                    ? "Une erreur est survenue"
                    : "Mise à jour réussie"}
                </p>
                <p className="mt-1 text-sm opacity-90">{message}</p>
              </div>
            </div>
          </div>
        )}

        <section className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10 text-2xl">
                  🔐
                </div>

                <div>
                  <h2 className="text-lg font-bold text-white">Sécurité du profil</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Vos données restent liées à votre compte.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                  <p className="text-sm leading-6 text-slate-300">
                    Votre adresse email est utilisée pour la connexion et ne peut pas être modifiée
                    ici.
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                  <p className="text-sm leading-6 text-slate-300">
                    Le numéro WhatsApp est synchronisé avec vos préférences de notification.
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <span className="mt-1 h-2 w-2 rounded-full bg-teal-300" />
                  <p className="text-sm leading-6 text-slate-300">
                    La localisation permet de personnaliser l’expérience selon votre marché.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-6 lg:p-8">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Informations personnelles</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Complétez votre profil pour améliorer le suivi de vos promotions et notifications.
                </p>
              </div>

              <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300">
                Profil client
              </span>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-slate-200">Nom complet</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Votre nom complet"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/70 focus:bg-slate-950 focus:ring-4 focus:ring-emerald-400/10"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-200">Adresse email</label>
                <input
                  value={email}
                  disabled
                  className="mt-2 w-full cursor-not-allowed rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-slate-500 outline-none"
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  L’email est celui utilisé pour la connexion.
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-200">Numéro WhatsApp</label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+225 07 00 00 00 00"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/70 focus:bg-slate-950 focus:ring-4 focus:ring-emerald-400/10"
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Ce numéro sera aussi synchronisé avec vos paramètres WhatsApp.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-200">Pays</label>
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/70 focus:bg-slate-950 focus:ring-4 focus:ring-emerald-400/10"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-200">Ville</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/70 focus:bg-slate-950 focus:ring-4 focus:ring-emerald-400/10"
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
                <p className="text-sm font-semibold text-emerald-200">
                  Synchronisation automatique
                </p>
                <p className="mt-1 text-sm leading-6 text-emerald-100/80">
                  En enregistrant votre profil, votre numéro WhatsApp est également mis à jour dans
                  vos préférences de notification.
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="group relative w-full overflow-hidden rounded-full bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-300 px-6 py-4 font-black text-slate-950 shadow-2xl shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:shadow-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="absolute inset-0 translate-y-full bg-white/30 transition group-hover:translate-y-0" />
                <span className="relative">
                  {isSaving ? "Enregistrement..." : "Enregistrer mon profil"}
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}