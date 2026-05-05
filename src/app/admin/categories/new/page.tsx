"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import AdminGuard from "../../../../components/AdminGuard";

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function getCategoryIcon(name: string) {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("aliment") || normalizedName.includes("food")) {
    return "🍽️";
  }

  if (normalizedName.includes("mode") || normalizedName.includes("vêtement")) {
    return "👗";
  }

  if (normalizedName.includes("tech") || normalizedName.includes("phone")) {
    return "📱";
  }

  if (normalizedName.includes("maison")) {
    return "🏠";
  }

  if (normalizedName.includes("beauté") || normalizedName.includes("beaute")) {
    return "💄";
  }

  if (normalizedName.includes("auto")) {
    return "🚗";
  }

  return "🏷️";
}

export default function NewCategoryPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    is_active: true,
  });

  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateField(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleNameChange(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: generateSlug(value),
    }));
  }

  function regenerateSlug() {
    setForm((current) => ({
      ...current,
      slug: generateSlug(current.name),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    if (!form.name.trim()) {
      setMessage("Veuillez renseigner le nom de la catégorie.");
      return;
    }

    if (!form.slug.trim()) {
      setMessage("Veuillez renseigner ou générer le slug de la catégorie.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("categories").insert({
      name: form.name.trim(),
      slug: generateSlug(form.slug),
      description: form.description.trim() || null,
      is_active: form.is_active,
    });

    setIsSaving(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setMessage("Catégorie ajoutée avec succès.");

    setForm({
      name: "",
      slug: "",
      description: "",
      is_active: true,
    });
  }

  const previewIcon = useMemo(() => {
    return getCategoryIcon(form.name);
  }, [form.name]);

  const descriptionLength = form.description.trim().length;

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
              href="/admin/categories"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
            >
              ← Retour aux catégories
            </a>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/admin"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Admin
              </a>

              <a
                href="/admin/deals"
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                🔥 Promotions
              </a>

              <button
                type="button"
                onClick={() => router.push("/admin/categories")}
                className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
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
                  Nouvelle catégorie
                </span>

                <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Créez un nouvel{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                    univers
                  </span>{" "}
                  de promotions.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Les catégories permettent de classer les offres, personnaliser
                  les recommandations et cibler les notifications selon les
                  centres d’intérêt des utilisateurs.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Statut</p>
                    <p className="mt-2 text-2xl font-black">
                      {form.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <p className="text-sm text-emerald-200">Slug</p>
                    <p className="mt-2 truncate text-xl font-black text-emerald-300">
                      {form.slug || "à générer"}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-cyan-400/25 bg-cyan-400/10 p-5">
                    <p className="text-sm text-cyan-200">Description</p>
                    <p className="mt-2 text-4xl font-black text-cyan-300">
                      {descriptionLength}
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
                    Aperçu catégorie
                  </p>

                  <div className="mt-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-emerald-400 to-teal-300 text-4xl shadow-lg shadow-emerald-500/20">
                    {previewIcon}
                  </div>

                  <h2 className="mt-5 text-3xl font-black">
                    {form.name || "Nom de la catégorie"}
                  </h2>

                  <p className="mt-3 text-sm font-semibold text-emerald-100">
                    /{form.slug || "slug-categorie"}
                  </p>

                  <p className="mt-5 leading-7 text-emerald-100">
                    {form.description ||
                      "La description de la catégorie apparaîtra ici pendant la saisie."}
                  </p>

                  <div className="mt-6">
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-black ${
                        form.is_active
                          ? "bg-emerald-400 text-slate-950"
                          : "border border-red-400/30 bg-red-400/10 text-red-300"
                      }`}
                    >
                      {form.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                  <p className="text-sm font-bold text-white">
                    Conseil produit
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    Une catégorie claire améliore les recommandations et rend les
                    filtres utilisateur plus simples à comprendre.
                  </p>
                </div>
              </div>
            </aside>
          </section>

          <form
            onSubmit={handleSubmit}
            className="mt-8 grid gap-6 lg:grid-cols-[1fr_.42fr]"
          >
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Informations principales
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  Identité de la catégorie
                </h2>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Nom de la catégorie
                    </label>

                    <input
                      value={form.name}
                      onChange={(event) => handleNameChange(event.target.value)}
                      required
                      placeholder="Ex : Automobile"
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
                          updateField("slug", generateSlug(event.target.value))
                        }
                        required
                        placeholder="automobile"
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

                    <p className="mt-2 text-xs text-slate-500">
                      Le slug est utilisé comme identifiant lisible.
                    </p>
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
                    rows={6}
                    placeholder="Décrivez brièvement cette catégorie..."
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                  />
                </div>
              </div>
            </section>

            <aside className="h-fit space-y-6 lg:sticky lg:top-6">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Visibilité
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  Statut de la catégorie
                </h2>

                <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/60 p-5 transition hover:bg-white/[0.06]">
                  <div>
                    <p className="font-bold">Catégorie active</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Une catégorie active est visible par les utilisateurs et
                      utilisable dans les promotions.
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
                    <p className="text-xs text-emerald-100">Statut</p>
                    <p className="mt-1 text-2xl font-black text-white">
                      {form.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-300 px-6 py-4 font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Création..." : "Créer la catégorie"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/admin/categories")}
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