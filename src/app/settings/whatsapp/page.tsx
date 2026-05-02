"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type NotificationPreference = {
  whatsapp_number: string | null;
  is_enabled: boolean | null;
  frequency: string | null;
  preferred_time: string | null;
};

export default function WhatsAppSettingsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [frequency, setFrequency] = useState("daily");
  const [preferredTime, setPreferredTime] = useState("08:00");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("whatsapp_number")
        .eq("id", user.id)
        .single();

      const { data: preferencesData } = await supabase
        .from("notification_preferences")
        .select("whatsapp_number, is_enabled, frequency, preferred_time")
        .eq("user_id", user.id)
        .maybeSingle();

      const preferences = preferencesData as NotificationPreference | null;

      setWhatsappNumber(
        preferences?.whatsapp_number || profileData?.whatsapp_number || ""
      );

      setIsEnabled(preferences?.is_enabled ?? true);
      setFrequency(preferences?.frequency || "daily");
      setPreferredTime(preferences?.preferred_time || "08:00");
      setIsLoading(false);
    }

    loadSettings();
  }, [router]);

  async function handleSave() {
    if (!userId) return;

    setMessage("");
    setIsSaving(true);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        whatsapp_number: whatsappNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

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
          is_enabled: isEnabled,
          frequency,
          preferred_time: preferredTime,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    setIsSaving(false);

    if (preferenceError) {
      setMessage(`Erreur préférences : ${preferenceError.message}`);
      return;
    }

    setMessage("Paramètres WhatsApp enregistrés avec succès.");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-slate-300">Chargement des paramètres WhatsApp...</p>
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

        <h1 className="mt-8 text-4xl font-bold">Paramètres WhatsApp</h1>

        <p className="mt-2 text-slate-300">
          Configurez la manière dont PromoPulse vous enverra les alertes de
          promotions personnalisées.
        </p>

        {message && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
            {message}
          </div>
        )}

        <div className="mt-8 space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-6">
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
              Utilisez le format international, par exemple +2250700000000.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">Recevoir les alertes WhatsApp</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Activez ou désactivez les notifications promotionnelles.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEnabled((value) => !value)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  isEnabled
                    ? "bg-emerald-400 text-slate-950"
                    : "bg-white/10 text-white"
                }`}
              >
                {isEnabled ? "Activées" : "Désactivées"}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-300">
              Fréquence des alertes
            </label>

            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            >
              <option value="instant">Instantanée</option>
              <option value="daily">Quotidienne</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="strong_deals_only">Promotions fortes uniquement</option>
              <option value="disabled">Aucune notification</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-300">
              Heure préférée d’envoi
            </label>

            <input
              type="time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-emerald-400"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
          >
            {isSaving ? "Enregistrement..." : "Enregistrer mes paramètres"}
          </button>
        </div>
      </div>
    </main>
  );
}