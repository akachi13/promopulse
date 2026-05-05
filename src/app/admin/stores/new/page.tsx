"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import AdminGuard from "../../../../components/AdminGuard";

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

function normalizeUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return "";

  if (
    trimmedValue.startsWith("http://") ||
    trimmedValue.startsWith("https://")
  ) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

export default function NewStorePage() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    country: "Côte d'Ivoire",
    city: "Abidjan",
    website_url: "",
    facebook_url: "",
    tiktok_url: "",
    is_active: true,
  });

  function updateField(
    field: keyof typeof form,
    value: string | boolean
  ) {
    setForm((current) => {
      if (field === "name") {
        const nameValue = value as string;

        return {
          ...current,
          name: nameValue,
          slug: current.slug ? current.slug : createSlug(nameValue),
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function regenerateSlug() {
    setForm((current) => ({
      ...current,
      slug: createSlug(current.name),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    if (!form.name.trim()) {
      setMessage("Veuillez renseigner le nom du magasin.");
      return;
    }

    if (!form.slug.trim()) {
      setMessage("Veuillez renseigner ou générer le slug du magasin.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.from("stores").insert({
      name: form.name.trim(),
      slug: createSlug(form.slug),
      description: form.description.trim() || null,
      country: form.country.trim() || null,
      city: form.city.trim() || null,
      website_url: normalizeUrl(form.website_url) || null,
      facebook_url: normalizeUrl(form.facebook_url) || null,
      tiktok_url: normalizeUrl(form.tiktok_url) || null,
      is_active: form.is_active,
    });

    setIsLoading(false);

    if (error) {
      setMessage(`Erreur lors de la création du magasin : ${error.message}`);
      return;
    }

    setMessage("Magasin ajouté avec succès.");

    setForm({
      name: "",
      slug: "",
      description: "",
      country: "Côte d'Ivoire",
      city: "Abidjan",
      website_url: "",
      facebook_url: "",
      tiktok_url: "",
      is_active: true,
    });
  }

  const completedSources = useMemo(() => {
    return [
      form.website_url.trim(),
      form.facebook_url.trim(),
      form.tiktok_url.trim(),
    ].filter(Boolean).length;
  }, [form.website_url, form.facebook_url, form.tiktok_url]);

  const previewInitial = form.name.trim()
    ? form.name.trim().slice(0, 1).toUpperCase()
    : "P";

  return (
    <AdminGuard>
      <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute left-1/2 top-[-20rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[150px]" />
          <div className="absolute right-[-14rem] top-56 h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-[130px]" />
          <div className="absolute bottom-[-14rem] left-[-14rem] h-[34rem] w-[34rem] rounded-full bg-emerald-700/15 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-8">
          <header className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <a
              href="/admin/stores"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
            >
              ← Retour aux magasins
            </a>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/admin"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Admin
              </a>

              <a
                href="/admin/import-promotions"
                className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
              >
                ✨ Import Gemini
              </a>

              <button
                type="button"
                onClick={() => router.push("/admin/stores")}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Voir la liste
              </button>
            </div>
          </header>

          {message && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-slate-200 backdrop-blur-xl">
              {message}
            </div>
          )}

          <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-2xl backdrop-blur-2xl md:p-9">
              <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,.8)]" />
                  Nouveau magasin partenaire
                </span>

                <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Ajoutez une{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                    enseigne
                  </span>{" "}
                  à PromoPulse.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Créez un magasin avec ses informations principales, ses liens
                  web, Facebook et TikTok afin de préparer la publication et
                  l’import intelligent de promotions.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Statut</p>
                    <p className="mt-2 text-2xl font-black">
                      {form.is_active ? "Actif" : "Inactif"}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <p className="text-sm text-emerald-200">Sources</p>
                    <p className="mt-2 text-4xl font-black text-emerald-300">
                      {completedSources}/3
                    </p>
                  </div>

                  <div className="rounded-3xl border border-cyan-400/25 bg-cyan-400/10 p-5">
                    <p className="text-sm text-cyan-200">Ville</p>
                    <p className="mt-2 truncate text-2xl font-black text-cyan-300">
                      {form.city || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-7 shadow-2xl shadow-emerald-950/30 backdrop-blur-2xl">
              <div className="absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-emerald-300/20 blur-3xl" />

              <div className="relative flex h-full flex-col justify-between gap-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                    Aperçu magasin
                  </p>

                  <div className="mt-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-emerald-400 to-teal-300 text-3xl font-black text-slate-950 shadow-lg shadow-emerald-500/20">
                    {previewInitial}
                  </div>

                  <h2 className="mt-5 text-3xl font-black">
                    {form.name || "Nom du magasin"}
                  </h2>

                  <p className="mt-3 text-sm font-semibold text-emerald-100">
                    /{form.slug || "slug-magasin"}
                  </p>

                  <p className="mt-5 leading-7 text-emerald-100">
                    {form.description ||
                      "La description du magasin apparaîtra ici pendant la saisie."}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                      {form.city || "Ville"}
                    </span>

                    <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">
                      {form.country || "Pays"}
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                  <p className="text-sm font-bold text-white">
                    Conseil import IA
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    Plus les liens du magasin sont complets, plus Gemini aura de
                    chances de détecter des promotions pertinentes.
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_.42fr]">
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                    Informations principales
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    Identité du magasin
                  </h2>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Nom du magasin
                    </label>

                    <input
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      required
                      placeholder="Ex : Carrefour"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Slug
                    </label>

                    <div className="mt-2 flex gap-3">
                      <input
                        value={form.slug}
                        onChange={(event) =>
                          updateField("slug", createSlug(event.target.value))
                        }
                        required
                        placeholder="carrefour"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                      />

                      <button
                        type="button"
                        onClick={regenerateSlug}
                        className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-white/[0.08]"
                      >
                        Générer
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="text-sm font-semibold text-slate-300">
                    Description
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    rows={5}
                    placeholder="Décrivez le magasin, ses offres habituelles ou sa spécialité..."
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                  />
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Localisation
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  Pays et ville
                </h2>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Pays
                    </label>

                    <input
                      value={form.country}
                      onChange={(event) =>
                        updateField("country", event.target.value)
                      }
                      placeholder="Côte d'Ivoire"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Ville
                    </label>

                    <input
                      value={form.city}
                      onChange={(event) =>
                        updateField("city", event.target.value)
                      }
                      placeholder="Abidjan"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Sources promotionnelles
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  Liens web, Facebook et TikTok
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Ces sources seront utilisées plus tard par l’import Gemini pour
                  détecter automatiquement les promotions.
                </p>

                <div className="mt-6 space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Site web
                    </label>

                    <input
                      value={form.website_url}
                      onChange={(event) =>
                        updateField("website_url", event.target.value)
                      }
                      placeholder="https://www.exemple.com"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Page Facebook
                    </label>

                    <input
                      value={form.facebook_url}
                      onChange={(event) =>
                        updateField("facebook_url", event.target.value)
                      }
                      placeholder="https://facebook.com/..."
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Compte TikTok
                    </label>

                    <input
                      value={form.tiktok_url}
                      onChange={(event) =>
                        updateField("tiktok_url", event.target.value)
                      }
                      placeholder="https://tiktok.com/@..."
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    />
                  </div>
                </div>
              </div>
            </section>

            <aside className="h-fit space-y-6 lg:sticky lg:top-6">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Visibilité
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  Statut du magasin
                </h2>

                <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/60 p-5 transition hover:bg-white/[0.06]">
                  <div>
                    <p className="font-bold">Magasin actif</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Un magasin actif peut être suivi par les utilisateurs et
                      utilisé dans les promotions.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      updateField("is_active", event.target.checked)
                    }
                    className="h-5 w-5"
                  />
                </label>
              </div>

              <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                  Résumé
                </p>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/40 p-4">
                    <p className="text-xs text-emerald-100">Nom</p>
                    <p className="mt-1 font-bold text-white">
                      {form.name || "Non renseigné"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/40 p-4">
                    <p className="text-xs text-emerald-100">Slug</p>
                    <p className="mt-1 break-all font-bold text-white">
                      {form.slug || "Non renseigné"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/40 p-4">
                    <p className="text-xs text-emerald-100">Sources complétées</p>
                    <p className="mt-1 text-2xl font-black text-white">
                      {completedSources}/3
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-300 px-6 py-4 font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Création..." : "Créer le magasin"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/admin/stores")}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-bold text-white transition hover:bg-white/[0.08]"
                >
                  Annuler
                </button>
              </div>
            </aside>
          </form>
        </div>
      </main>
    </AdminGuard>
  );
}