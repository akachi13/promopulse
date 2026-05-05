const features = [
  {
    title: "Promotions centralisées",
    description:
      "Regroupez les offres de vos magasins préférés dans une seule interface claire, rapide et personnalisée.",
    icon: "◎",
  },
  {
    title: "Alertes personnalisées",
    description:
      "Recevez les promotions les plus pertinentes selon vos magasins, catégories et préférences.",
    icon: "↗",
  },
  {
    title: "Import intelligent",
    description:
      "L’admin peut analyser des sources web avec l’IA pour préparer rapidement des promotions en brouillon.",
    icon: "✦",
  },
  {
    title: "Suivi par abonnement",
    description:
      "Chaque formule définit le nombre de magasins et catégories que l’utilisateur peut suivre.",
    icon: "◌",
  },
];

const steps = [
  {
    number: "01",
    title: "Choisissez vos magasins",
    description:
      "Sélectionnez les enseignes que vous souhaitez suivre : supermarchés, boutiques, malls ou magasins spécialisés.",
  },
  {
    number: "02",
    title: "Définissez vos catégories",
    description:
      "Alimentation, beauté, électroménager, mode, téléphonie ou maison : personnalisez vos centres d’intérêt.",
  },
  {
    number: "03",
    title: "Consultez les offres",
    description:
      "PromoPulse affiche uniquement les promotions publiées et pertinentes selon vos préférences.",
  },
  {
    number: "04",
    title: "Recevez vos alertes",
    description:
      "Les notifications WhatsApp réelles viendront compléter l’expérience dans une prochaine phase.",
  },
];

const pricing = [
  {
    name: "Basic",
    price: "À définir",
    description: "Pour découvrir PromoPulse simplement.",
    items: ["3 magasins suivis", "3 catégories suivies", "Alertes hebdomadaires"],
  },
  {
    name: "Standard",
    price: "À définir",
    description: "Pour suivre régulièrement les meilleures offres.",
    items: ["7 magasins suivis", "6 catégories suivies", "Alertes quotidiennes"],
    highlighted: true,
  },
  {
    name: "Premium",
    price: "À définir",
    description: "Pour ne manquer aucune opportunité importante.",
    items: ["Magasins élargis", "Catégories élargies", "Alertes prioritaires"],
  },
];

const faqs = [
  {
    question: "Comment fonctionne PromoPulse ?",
    answer:
      "L’utilisateur choisit ses magasins et catégories. PromoPulse affiche ensuite les promotions publiées qui correspondent à ces préférences.",
  },
  {
    question: "Les alertes WhatsApp sont-elles déjà réelles ?",
    answer:
      "Pour l’instant, les alertes WhatsApp sont simulées dans le MVP. L’intégration WhatsApp Business réelle fait partie des prochaines évolutions.",
  },
  {
    question: "L’admin peut-il importer automatiquement des promotions ?",
    answer:
      "Oui. L’admin peut scanner les sources d’un magasin, utiliser l’IA pour détecter les promotions, corriger les suggestions et les publier ensuite.",
  },
  {
    question: "Les prix des abonnements sont-ils définitifs ?",
    answer:
      "Non. Les tarifs peuvent être ajustés après les premiers tests commerciaux et les retours utilisateurs.",
  },
];

const stats = [
  { value: "8+", label: "Magasins suivis" },
  { value: "8", label: "Catégories" },
  { value: "IA", label: "Import intelligent" },
  { value: "24/7", label: "Accès aux offres" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-18rem] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[140px]" />
        <div className="absolute right-[-10rem] top-64 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-[-12rem] h-[30rem] w-[30rem] rounded-full bg-emerald-700/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <header className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="group flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-300 font-black text-slate-950 shadow-lg shadow-emerald-500/20">
              P
            </span>
            <span className="text-xl font-black tracking-tight">
              Promo<span className="text-emerald-400">Pulse</span>
            </span>
          </a>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-400 md:flex">
            <a href="#fonctionnement" className="transition hover:text-white">
              Fonctionnement
            </a>
            <a href="#avantages" className="transition hover:text-white">
              Avantages
            </a>
            <a href="#tarifs" className="transition hover:text-white">
              Tarifs
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 sm:inline-flex"
            >
              Connexion
            </a>

            <a
              href="/register"
              className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:shadow-emerald-500/40"
            >
              Commencer
            </a>
          </div>
        </nav>
      </header>

      <section className="relative px-6 pb-20 pt-36 lg:pb-28 lg:pt-44">
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300 shadow-lg shadow-emerald-500/10">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,.8)]" />
              Plateforme intelligente de promotions personnalisées
            </span>

            <h1 className="mt-8 text-5xl font-black tracking-tight text-white md:text-7xl lg:text-8xl">
              Ne ratez plus{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                aucune promo
              </span>
              .
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-400 md:text-xl">
              PromoPulse vous aide à suivre les meilleures offres de vos
              magasins préférés, à personnaliser vos catégories et à préparer
              l’envoi d’alertes WhatsApp ciblées.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="/register"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-300 px-8 py-4 font-bold text-slate-950 shadow-[0_12px_48px_rgba(16,185,129,.35)] transition hover:-translate-y-1 hover:shadow-[0_18px_60px_rgba(16,185,129,.5)] sm:w-auto"
              >
                Créer un compte
                <span className="transition group-hover:translate-x-1">→</span>
              </a>

              <a
                href="#fonctionnement"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4 font-semibold text-white transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08] sm:w-auto"
              >
                Voir comment ça marche
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-sm text-slate-500">
              <span>✓ Onboarding utilisateur</span>
              <span>✓ Abonnements avec limites</span>
              <span>✓ Import IA côté admin</span>
            </div>
          </div>

          <div className="relative mx-auto mt-20 max-w-6xl">
            <div className="absolute -inset-1 rounded-[2.25rem] bg-gradient-to-r from-emerald-400/30 via-cyan-400/10 to-emerald-400/20 blur-2xl" />

            <div className="relative grid gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-2xl lg:grid-cols-[1.1fr_.9fr] lg:p-5">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Dashboard utilisateur</p>
                    <h2 className="mt-1 text-2xl font-bold">
                      Offres recommandées
                    </h2>
                  </div>

                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                    6 promos actives
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="mt-2 text-3xl font-black">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
                    <div className="flex h-40 items-center justify-center bg-gradient-to-br from-emerald-400/20 to-slate-900">
                      <span className="rounded-full bg-emerald-400 px-4 py-1.5 text-sm font-black text-slate-950">
                        -24%
                      </span>
                    </div>

                    <div className="p-5">
                      <h3 className="text-lg font-bold">
                        Pack huile et riz en promotion
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Offre spéciale sur les produits alimentaires cette semaine.
                      </p>

                      <div className="mt-4 flex items-end justify-between rounded-2xl bg-slate-950 p-4">
                        <div>
                          <p className="text-xs text-slate-500">Ancien prix</p>
                          <p className="text-sm text-slate-500 line-through">
                            25 000 F CFA
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Nouveau prix</p>
                          <p className="text-xl font-black text-emerald-300">
                            19 000 F CFA
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm font-semibold text-emerald-300">
                      Alerte WhatsApp
                    </p>
                    <h3 className="mt-2 text-2xl font-black">
                      Nouvelle promotion
                    </h3>

                    <div className="mt-5 rounded-3xl bg-emerald-400 p-5 text-slate-950">
                      <p className="font-black">Bonjour 👋</p>
                      <p className="mt-2 text-sm leading-6">
                        SuperMarket Plus vient de publier une offre alimentaire
                        qui correspond à vos préférences.
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white/[0.06] p-4">
                        <p className="text-xs text-slate-500">Magasin</p>
                        <p className="mt-1 font-semibold">SuperMarket</p>
                      </div>
                      <div className="rounded-2xl bg-white/[0.06] p-4">
                        <p className="text-xs text-slate-500">Catégorie</p>
                        <p className="mt-1 font-semibold">Alimentation</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Back-office admin</p>
                    <h2 className="mt-1 text-2xl font-bold">Import IA</h2>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">
                    draft
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
                      Source analysée
                    </p>
                    <p className="mt-3 text-lg font-bold">Carrefour Côte d’Ivoire</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Détection intelligente par catégorie, prix et validité.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-300">
                        Score IA
                      </span>
                      <span className="text-2xl font-black text-emerald-300">
                        96%
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-emerald-100">
                      Promotion détectée, catégorie validée, brouillon prêt pour
                      validation admin.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm text-slate-500">Workflow</p>
                    <div className="mt-4 space-y-3">
                      {["Scanner", "Corriger", "Publier", "Notifier"].map(
                        (item, index) => (
                          <div key={item} className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-slate-950">
                              {index + 1}
                            </span>
                            <span className="font-semibold">{item}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="fonctionnement" className="relative px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">
              Fonctionnement
            </p>
            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
              Une expérience simple pour l’utilisateur, puissante pour l’admin.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="group rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07]"
              >
                <span className="text-sm font-black text-emerald-300">
                  {step.number}
                </span>
                <h3 className="mt-8 text-xl font-black">{step.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="avantages" className="relative px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">
              Avantages
            </p>
            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
              Un MVP déjà pensé pour évoluer.
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-400">
              PromoPulse démarre avec l’essentiel : préférences, promotions,
              abonnements, notifications simulées et import IA. Les briques
              WhatsApp, Meta/TikTok et paiement pourront venir ensuite.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[0.07]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-xl font-black text-emerald-300">
                  {feature.icon}
                </div>
                <h3 className="mt-6 text-xl font-black">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tarifs" className="relative px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">
              Tarifs
            </p>
            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
              Des forfaits prêts pour la commercialisation.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-400">
              Les prix restent à définir, mais les limites par formule sont déjà
              exploitables dans la plateforme.
            </p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`relative overflow-hidden rounded-[2rem] border p-8 ${
                  plan.highlighted
                    ? "border-emerald-300 bg-gradient-to-br from-emerald-400 to-teal-300 text-slate-950 shadow-[0_20px_80px_rgba(16,185,129,.35)]"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute right-5 top-5 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                    Populaire
                  </span>
                )}

                <h3 className="text-2xl font-black">{plan.name}</h3>

                <p
                  className={`mt-3 leading-7 ${
                    plan.highlighted ? "text-slate-800" : "text-slate-400"
                  }`}
                >
                  {plan.description}
                </p>

                <p className="mt-8 text-4xl font-black">{plan.price}</p>

                <ul className="mt-8 space-y-4">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                          plan.highlighted
                            ? "bg-slate-950 text-white"
                            : "bg-emerald-400 text-slate-950"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="font-semibold">{item}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="/register"
                  className={`mt-8 inline-flex w-full justify-center rounded-2xl px-6 py-4 font-black transition hover:-translate-y-1 ${
                    plan.highlighted
                      ? "bg-slate-950 text-white"
                      : "bg-white text-slate-950"
                  }`}
                >
                  Choisir cette formule
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="relative px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">
              FAQ
            </p>
            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
              Questions fréquentes
            </h2>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                <h3 className="text-lg font-black">{faq.question}</h3>
                <p className="mt-3 leading-7 text-slate-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/15 via-white/[0.04] to-slate-950 p-10 text-center shadow-2xl shadow-emerald-950/40 md:p-14">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">
            Prêt pour la démo ?
          </p>
          <h2 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
            Lancez PromoPulse et testez le parcours complet.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Créez un compte, passez l’onboarding, choisissez une formule,
            suivez vos magasins et consultez vos promotions personnalisées.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/register"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-300 px-8 py-4 font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-1"
            >
              Créer mon compte
            </a>

            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4 font-bold text-white transition hover:-translate-y-1 hover:bg-white/[0.08]"
            >
              Se connecter
            </a>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-300 text-xs font-black text-slate-950">
              P
            </span>
            <p className="font-semibold">
              © 2026 PromoPulse. Tous droits réservés.
            </p>
          </div>

          <div className="flex gap-6">
            <a href="#" className="transition hover:text-white">
              Confidentialité
            </a>
            <a href="#" className="transition hover:text-white">
              Conditions
            </a>
            <a href="#" className="transition hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}