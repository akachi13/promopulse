"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import AdminGuard from "../../../../../components/AdminGuard";

type Store = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
};

type DealStatus = "draft" | "published" | "expired" | "archived" | "rejected";

function formatPrice(price: string) {
  if (!price) return "0 FCFA";

  const value = Number(price);

  if (Number.isNaN(value)) return "0 FCFA";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value);
}

function toNumberOrNull(value: string) {
  if (!value) return null;

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return null;

  return numberValue;
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

function calculateDiscount(oldPrice: string, newPrice: string) {
  const oldValue = Number(oldPrice);
  const newValue = Number(newPrice);

  if (!oldValue || !newValue || oldValue <= 0 || newValue >= oldValue) {
    return "";
  }

  return String(Math.round(((oldValue - newValue) / oldValue) * 100));
}

function getStatusLabel(status: string) {
  if (status === "published") return "Publiée";
  if (status === "draft") return "Brouillon";
  if (status === "expired") return "Expirée";
  if (status === "archived") return "Archivée";
  if (status === "rejected") return "Rejetée";

  return status || "Brouillon";
}

function getStatusIcon(status: string) {
  if (status === "published") return "✅";
  if (status === "draft") return "📝";
  if (status === "expired") return "⏳";
  if (status === "archived") return "📦";
  if (status === "rejected") return "⛔";

  return "📝";
}

function getStatusClass(status: string) {
  if (status === "published") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "draft") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }

  if (status === "expired") {
    return "border-red-400/25 bg-red-400/10 text-red-300";
  }

  if (status === "archived") {
    return "border-slate-400/25 bg-slate-400/10 text-slate-300";
  }

  if (status === "rejected") {
    return "border-red-400/25 bg-red-400/10 text-red-300";
  }

  return "border-white/10 bg-white/[0.04] text-slate-300";
}

export default function EditDealPage() {
  const params = useParams();
  const router = useRouter();

  const dealIdParam = params.id;
  const dealId = Array.isArray(dealIdParam) ? dealIdParam[0] : dealIdParam;

  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    image_url: "",
    store_id: "",
    category_id: "",
    old_price: "",
    new_price: "",
    discount_percentage: "",
    valid_until: "",
    city: "Abidjan",
    status: "draft" as DealStatus,
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!dealId) {
        setMessage("Identifiant de promotion introuvable.");
        setIsLoading(false);
        return;
      }

      const { data: storesData, error: storesError } = await supabase
        .from("stores")
        .select("id, name")
        .order("name", { ascending: true });

      if (storesError) {
        setMessage(`Erreur magasins : ${storesError.message}`);
        setIsLoading(false);
        return;
      }

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });

      if (categoriesError) {
        setMessage(`Erreur catégories : ${categoriesError.message}`);
        setIsLoading(false);
        return;
      }

      const { data: dealData, error: dealError } = await supabase
        .from("deals")
        .select(
          `
          title,
          description,
          image_url,
          store_id,
          category_id,
          old_price,
          new_price,
          discount_percentage,
          valid_until,
          city,
          status
        `
        )
        .eq("id", dealId)
        .single();

      if (dealError) {
        setMessage(`Erreur lors du chargement : ${dealError.message}`);
        setIsLoading(false);
        return;
      }

      setStores((storesData || []) as Store[]);
      setCategories((categoriesData || []) as Category[]);

      setForm({
        title: dealData.title || "",
        description: dealData.description || "",
        image_url: dealData.image_url || "",
        store_id: dealData.store_id || "",
        category_id: dealData.category_id || "",
        old_price:
          dealData.old_price !== null && dealData.old_price !== undefined
            ? String(dealData.old_price)
            : "",
        new_price:
          dealData.new_price !== null && dealData.new_price !== undefined
            ? String(dealData.new_price)
            : "",
        discount_percentage:
          dealData.discount_percentage !== null &&
          dealData.discount_percentage !== undefined
            ? String(dealData.discount_percentage)
            : "",
        valid_until: dealData.valid_until || "",
        city: dealData.city || "Abidjan",
        status: (dealData.status || "draft") as DealStatus,
      });

      setIsLoading(false);
    }

    loadData();
  }, [dealId]);

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => {
      const updated = {
        ...current,
        [name]: value,
      };

      if (
        (name === "old_price" || name === "new_price") &&
        !current.discount_percentage
      ) {
        updated.discount_percentage = calculateDiscount(
          name === "old_price" ? value : current.old_price,
          name === "new_price" ? value : current.new_price
        );
      }

      return updated;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dealId) {
      setMessage("Identifiant de promotion introuvable.");
      return;
    }

    if (!form.title.trim()) {
      setMessage("Veuillez renseigner le titre de la promotion.");
      return;
    }

    if (!form.store_id) {
      setMessage("Veuillez sélectionner un magasin.");
      return;
    }

    if (!form.category_id) {
      setMessage("Veuillez sélectionner une catégorie.");
      return;
    }

    setMessage("");
    setIsSaving(true);

    const { error } = await supabase
      .from("deals")
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: normalizeUrl(form.image_url) || null,
        store_id: form.store_id,
        category_id: form.category_id,
        old_price: toNumberOrNull(form.old_price),
        new_price: toNumberOrNull(form.new_price),
        discount_percentage: toNumberOrNull(form.discount_percentage),
        valid_until: form.valid_until || null,
        city: form.city.trim() || "Abidjan",
        status: form.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId);

    setIsSaving(false);

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      return;
    }

    setMessage("Promotion modifiée avec succès.");
  }

  const selectedStore = useMemo(() => {
    return stores.find((store) => store.id === form.store_id) || null;
  }, [stores, form.store_id]);

  const selectedCategory = useMemo(() => {
    return (
      categories.find((category) => category.id === form.category_id) || null
    );
  }, [categories, form.category_id]);

  const previewDiscount = form.discount_percentage
    ? `-${form.discount_percentage}%`
    : "Offre spéciale";

  if (isLoading) {
    return (
      <AdminGuard>
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-6 text-white">
          <div className="pointer-events-none fixed inset-0">
            <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[130px]" />
            <div className="absolute bottom-[-12rem] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-emerald-700/15 blur-[120px]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
          </div>

          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 text-center shadow-2xl backdrop-blur-2xl">
            <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-emerald-400/30" />
            <p className="mt-5 text-slate-300">
              Chargement de la promotion...
            </p>
          </div>
        </main>
      </AdminGuard>
    );
  }

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
              href="/admin/deals"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
            >
              ← Retour aux promotions
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

              <a
                href="/admin/deals/new"
                className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5"
              >
                + Nouvelle promotion
              </a>
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
                  Modification de promotion
                </span>

                <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  Ajustez votre{" "}
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                    offre
                  </span>{" "}
                  commerciale.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Modifiez le contenu, l’image, les prix, le magasin, la
                  catégorie, la ville, la validité et le statut de cette
                  promotion.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-500">Magasin</p>
                    <p className="mt-2 truncate text-2xl font-black">
                      {selectedStore?.name || "—"}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <p className="text-sm text-emerald-200">Statut</p>
                    <p className="mt-2 text-2xl font-black text-emerald-300">
                      {getStatusLabel(form.status)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-cyan-400/25 bg-cyan-400/10 p-5">
                    <p className="text-sm text-cyan-200">Réduction</p>
                    <p className="mt-2 text-3xl font-black text-cyan-300">
                      {previewDiscount}
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
                    Aperçu en direct
                  </p>

                  <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-emerald-300/20 bg-slate-950/40">
                    {form.image_url ? (
                      <img
                        src={form.image_url}
                        alt="Aperçu promotion"
                        className="h-56 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-56 items-center justify-center bg-gradient-to-br from-emerald-400/20 via-slate-900 to-slate-950">
                        <span className="text-sm font-black text-emerald-300">
                          PromoPulse
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-4 py-2 text-sm font-black ${getStatusClass(
                        form.status
                      )}`}
                    >
                      {getStatusIcon(form.status)} {getStatusLabel(form.status)}
                    </span>

                    <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                      {previewDiscount}
                    </span>
                  </div>

                  <h2 className="mt-5 text-3xl font-black">
                    {form.title || "Titre de la promotion"}
                  </h2>

                  <p className="mt-4 line-clamp-4 leading-7 text-emerald-100">
                    {form.description ||
                      "La description de l’offre apparaîtra ici pendant la modification."}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/40 p-4">
                      <p className="text-xs text-emerald-100">Ancien prix</p>
                      <p className="mt-1 text-sm font-bold text-slate-400 line-through">
                        {formatPrice(form.old_price)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/40 p-4 text-right">
                      <p className="text-xs text-emerald-100">Nouveau prix</p>
                      <p className="mt-1 text-xl font-black text-white">
                        {formatPrice(form.new_price)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-slate-950/40 p-5">
                  <p className="text-sm font-bold text-white">
                    Visibilité
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-100">
                    Seules les promotions publiées sont visibles côté client.
                    Les brouillons et archives restent dans le back-office.
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
                  Contenu de l’offre
                </h2>

                <div className="mt-6">
                  <label className="text-sm font-semibold text-slate-300">
                    Titre de l’offre
                  </label>

                  <input
                    value={form.title}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                    required
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                  />
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
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                  />
                </div>

                <div className="mt-5">
                  <label className="text-sm font-semibold text-slate-300">
                    Image de la promotion
                  </label>

                  <input
                    value={form.image_url}
                    onChange={(event) =>
                      updateField("image_url", event.target.value)
                    }
                    placeholder="https://exemple.com/image-promotion.jpg"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                  />
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Classement
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  Magasin et catégorie
                </h2>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Magasin
                    </label>

                    <select
                      value={form.store_id}
                      onChange={(event) =>
                        updateField("store_id", event.target.value)
                      }
                      required
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    >
                      <option value="">Sélectionner un magasin</option>

                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Catégorie
                    </label>

                    <select
                      value={form.category_id}
                      onChange={(event) =>
                        updateField("category_id", event.target.value)
                      }
                      required
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    >
                      <option value="">Sélectionner une catégorie</option>

                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs text-slate-500">Magasin choisi</p>
                    <p className="mt-1 font-bold text-slate-200">
                      {selectedStore?.name || "Non sélectionné"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs text-slate-500">Catégorie choisie</p>
                    <p className="mt-1 font-bold text-slate-200">
                      {selectedCategory?.name || "Non sélectionnée"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Prix et validité
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  Montants et période
                </h2>

                <div className="mt-6 grid gap-5 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Ancien prix
                    </label>

                    <input
                      type="number"
                      value={form.old_price}
                      onChange={(event) =>
                        updateField("old_price", event.target.value)
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    />

                    <p className="mt-1 text-xs text-slate-500 line-through">
                      {formatPrice(form.old_price)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Nouveau prix
                    </label>

                    <input
                      type="number"
                      value={form.new_price}
                      onChange={(event) =>
                        updateField("new_price", event.target.value)
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    />

                    <p className="mt-1 text-xs font-bold text-emerald-300">
                      {formatPrice(form.new_price)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Réduction %
                    </label>

                    <input
                      type="number"
                      value={form.discount_percentage}
                      onChange={(event) =>
                        updateField(
                          "discount_percentage",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Ville
                    </label>

                    <input
                      value={form.city}
                      onChange={(event) =>
                        updateField("city", event.target.value)
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300">
                      Date de fin
                    </label>

                    <input
                      type="date"
                      value={form.valid_until}
                      onChange={(event) =>
                        updateField("valid_until", event.target.value)
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    />
                  </div>
                </div>
              </div>
            </section>

            <aside className="h-fit space-y-6 lg:sticky lg:top-6">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Statut
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  État de la promotion
                </h2>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField("status", event.target.value)
                  }
                  className="mt-6 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-white outline-none transition hover:border-white/20 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="expired">expired</option>
                  <option value="archived">archived</option>
                  <option value="rejected">rejected</option>
                </select>

                <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                  <p className="text-sm font-bold text-white">
                    {getStatusIcon(form.status)} {getStatusLabel(form.status)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Changez le statut pour contrôler la visibilité et le cycle
                    de vie de cette promotion.
                  </p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                  Résumé
                </p>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/40 p-4">
                    <p className="text-xs text-emerald-100">Titre</p>
                    <p className="mt-1 line-clamp-2 font-bold text-white">
                      {form.title || "Non renseigné"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/40 p-4">
                    <p className="text-xs text-emerald-100">Prix</p>
                    <p className="mt-1 text-2xl font-black text-white">
                      {formatPrice(form.new_price)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-300/20 bg-slate-950/40 p-4">
                    <p className="text-xs text-emerald-100">Statut</p>
                    <p className="mt-1 font-bold text-white">
                      {getStatusLabel(form.status)}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-300 px-6 py-4 font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? "Enregistrement..."
                    : "Enregistrer les modifications"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/admin/deals")}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-bold text-white transition hover:bg-white/[0.08]"
                >
                  Retour
                </button>
              </div>
            </aside>
          </form>
        </div>
      </main>
    </AdminGuard>
  );
}