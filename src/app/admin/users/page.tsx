"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp_number: string | null;
  country: string | null;
  city: string | null;
  role: string | null;
  account_status: string | null;
  created_at: string | null;
};

function formatDate(date: string | null) {
  if (!date) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  async function loadProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, whatsapp_number, country, city, role, account_status, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Erreur lors du chargement des utilisateurs : ${error.message}`);
      setIsLoading(false);
      return;
    }

    setProfiles((data || []) as Profile[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  async function updateRole(userId: string, role: string) {
    setMessage("");
    setUpdatingUserId(userId);

    const { error } = await supabase
      .from("profiles")
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setUpdatingUserId(null);

    if (error) {
      setMessage(`Erreur lors du changement de rôle : ${error.message}`);
      return;
    }

    setProfiles((current) =>
      current.map((profile) =>
        profile.id === userId ? { ...profile, role } : profile
      )
    );

    setMessage("Rôle mis à jour avec succès.");
  }

  async function updateStatus(userId: string, accountStatus: string) {
    setMessage("");
    setUpdatingUserId(userId);

    const { error } = await supabase
      .from("profiles")
      .update({
        account_status: accountStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setUpdatingUserId(null);

    if (error) {
      setMessage(`Erreur lors du changement de statut : ${error.message}`);
      return;
    }

    setProfiles((current) =>
      current.map((profile) =>
        profile.id === userId
          ? { ...profile, account_status: accountStatus }
          : profile
      )
    );

    setMessage("Statut du compte mis à jour avec succès.");
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <a href="/admin" className="text-sm text-emerald-300">
            ← Retour à l’administration
          </a>

          <div className="mt-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold">Gestion des utilisateurs</h1>
              <p className="mt-2 text-slate-300">
                Consultez les comptes inscrits, leurs rôles et leurs statuts.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-sm text-slate-400">Utilisateurs</p>
              <p className="mt-1 text-3xl font-bold">{profiles.length}</p>
            </div>
          </div>

          {isLoading && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Chargement des utilisateurs...
            </div>
          )}

          {message && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
              {message}
            </div>
          )}

          {!isLoading && profiles.length === 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Aucun utilisateur enregistré pour le moment.
            </div>
          )}

          {!isLoading && profiles.length > 0 && (
            <div className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
              <div className="hidden grid-cols-7 gap-4 border-b border-white/10 px-6 py-4 text-sm font-semibold text-slate-300 md:grid">
                <span>Utilisateur</span>
                <span>Email</span>
                <span>WhatsApp</span>
                <span>Ville</span>
                <span>Rôle</span>
                <span>Statut</span>
                <span>Inscription</span>
              </div>

              <div className="divide-y divide-white/10">
                {profiles.map((profile) => {
                  const isUpdating = updatingUserId === profile.id;

                  return (
                    <div
                      key={profile.id}
                      className="grid gap-4 px-6 py-5 text-sm md:grid-cols-7 md:items-center"
                    >
                      <div>
                        <p className="font-semibold text-white">
                          {profile.full_name || "Nom non renseigné"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {profile.country || "Pays non renseigné"}
                        </p>
                      </div>

                      <p className="break-all text-slate-300">
                        {profile.email || "Non renseigné"}
                      </p>

                      <p className="text-slate-300">
                        {profile.whatsapp_number || "Non renseigné"}
                      </p>

                      <p className="text-slate-300">
                        {profile.city || "Non renseignée"}
                      </p>

                      <select
                        value={profile.role || "user"}
                        onChange={(e) => updateRole(profile.id, e.target.value)}
                        disabled={isUpdating}
                        className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-400 disabled:opacity-60"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>

                      <select
                        value={profile.account_status || "active"}
                        onChange={(e) =>
                          updateStatus(profile.id, e.target.value)
                        }
                        disabled={isUpdating}
                        className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 outline-none focus:border-emerald-400 disabled:opacity-60"
                      >
                        <option value="active">active</option>
                        <option value="suspended">suspended</option>
                        <option value="inactive">inactive</option>
                      </select>

                      <p className="text-slate-400">
                        {formatDate(profile.created_at)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}