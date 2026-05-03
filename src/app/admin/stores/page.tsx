"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../../components/AdminGuard";

type Store = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  country: string | null;
  city: string | null;
  is_active: boolean | null;
};

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadStores() {
    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("stores")
      .select("id, name, slug, description, country, city, is_active")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Erreur lors du chargement des magasins : ${error.message}`);
      setIsLoading(false);
      return;
    }

    setStores((data || []) as Store[]);
    setIsLoading(false);
  }

  useEffect(() => {
    loadStores();
  }, []);

  async function deleteStore(storeId: string, storeName: string) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le magasin "${storeName}" ?`
    );

    if (!confirmed) return;

    setMessage("");
    setDeletingId(storeId);

    const { error } = await supabase.from("stores").delete().eq("id", storeId);

    setDeletingId(null);

    if (error) {
      setMessage(`Erreur lors de la suppression : ${error.message}`);
      return;
    }

    setStores((current) => current.filter((store) => store.id !== storeId));
    setMessage("Magasin supprimé avec succès.");
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
              <h1 className="text-4xl font-bold">Gestion des magasins</h1>
              <p className="mt-2 text-slate-300">
                Ajoutez, modifiez ou supprimez les enseignes disponibles sur
                PromoPulse.
              </p>
            </div>

            <a
              href="/admin/stores/new"
              className="inline-flex rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Ajouter un magasin
            </a>
          </div>

          {isLoading && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Chargement des magasins...
            </div>
          )}

          {message && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
              {message}
            </div>
          )}

          {!isLoading && stores.length === 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">
              Aucun magasin enregistré pour le moment.
            </div>
          )}

          {!isLoading && stores.length > 0 && (
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {stores.map((store) => {
                const isDeleting = deletingId === store.id;

                return (
                  <div
                    key={store.id}
                    className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-emerald-400/20" />

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          store.is_active
                            ? "bg-emerald-400/20 text-emerald-300"
                            : "bg-red-400/20 text-red-300"
                        }`}
                      >
                        {store.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>

                    <h2 className="mt-5 text-xl font-semibold">
                      {store.name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">{store.slug}</p>

                    <p className="mt-4 leading-7 text-slate-300">
                      {store.description || "Aucune description."}
                    </p>

                    <p className="mt-4 text-sm text-slate-400">
                      {store.city || "Ville non renseignée"}{" "}
                      {store.country ? `— ${store.country}` : ""}
                    </p>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <a
                        href={`/admin/stores/${store.id}/edit`}
                        className="inline-flex justify-center rounded-full bg-white px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-slate-200"
                      >
                        Modifier
                      </a>

                      <button
                        onClick={() => deleteStore(store.id, store.name)}
                        disabled={isDeleting}
                        className="inline-flex justify-center rounded-full border border-red-400/40 px-5 py-2.5 font-semibold text-red-300 transition hover:bg-red-400/10 disabled:opacity-60"
                      >
                        {isDeleting ? "Suppression..." : "Supprimer"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}