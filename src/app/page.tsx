const features = [
  {
    title: "Économisez plus",
    description:
      "Recevez les meilleures promotions de vos magasins préférés sans perdre du temps à chercher partout.",
  },
  {
    title: "Alertes WhatsApp",
    description:
      "Les offres importantes arrivent directement sur WhatsApp selon vos préférences.",
  },
  {
    title: "Offres personnalisées",
    description:
      "PromoPulse sélectionne les promotions selon vos magasins, catégories et centres d’intérêt.",
  },
  {
    title: "Multi-enseignes",
    description:
      "Suivez plusieurs supermarchés, centres commerciaux, boutiques et enseignes depuis une seule plateforme.",
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
    title: "Définissez vos préférences",
    description:
      "Indiquez vos catégories favorites : alimentation, électronique, mode, beauté, maison, téléphonie, etc.",
  },
  {
    number: "03",
    title: "Recevez vos alertes",
    description:
      "PromoPulse vous envoie les promotions les plus pertinentes directement sur WhatsApp.",
  },
];

const pricing = [
  {
    name: "Basic",
    price: "À définir",
    description: "Pour découvrir PromoPulse simplement.",
    items: ["3 magasins suivis", "3 catégories", "Alertes hebdomadaires"],
  },
  {
    name: "Standard",
    price: "À définir",
    description: "Pour suivre régulièrement vos meilleures offres.",
    items: ["7 magasins suivis", "6 catégories", "Alertes quotidiennes"],
    highlighted: true,
  },
  {
    name: "Premium",
    price: "À définir",
    description: "Pour ne manquer aucune opportunité.",
    items: ["Magasins élargis", "Catégories élargies", "Alertes prioritaires"],
  },
];

const faqs = [
  {
    question: "Comment fonctionne PromoPulse ?",
    answer:
      "Vous choisissez vos magasins et vos catégories préférées. PromoPulse vous affiche les offres pertinentes et vous envoie des alertes personnalisées.",
  },
  {
    question: "Les alertes sont-elles envoyées sur WhatsApp ?",
    answer:
      "Oui. L’objectif est de permettre aux utilisateurs de recevoir les meilleures promotions directement sur WhatsApp.",
  },
  {
    question: "Puis-je choisir mes magasins ?",
    answer:
      "Oui. Chaque utilisateur pourra sélectionner les magasins qu’il souhaite suivre selon son abonnement.",
  },
  {
    question: "Les prix des abonnements sont-ils définitifs ?",
    answer:
      "Non. Les prix seront définis après la phase de cadrage commercial et les premiers tests utilisateurs.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="/" className="text-xl font-bold tracking-tight">
            Promo<span className="text-emerald-400">Pulse</span>
          </a>

          <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#fonctionnement" className="hover:text-white">
              Comment ça marche
            </a>
            <a href="#avantages" className="hover:text-white">
              Avantages
            </a>
            <a href="#tarifs" className="hover:text-white">
              Tarifs
            </a>
            <a href="#faq" className="hover:text-white">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:inline-flex"
            >
              Connexion
            </a>

            <a
              href="/register"
              className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Commencer
            </a>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden px-6 pt-36">
        <div className="absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-10 top-40 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 py-20 lg:grid-cols-2">
          <div>
            <span className="mb-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
              Plateforme intelligente de promotions personnalisées
            </span>

            <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
              Ne ratez plus jamais une bonne affaire.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              PromoPulse vous aide à suivre les meilleures promotions de vos
              magasins préférés et à recevoir des alertes personnalisées
              directement sur WhatsApp.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href="/register"
                className="rounded-full bg-emerald-400 px-8 py-4 font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Commencer maintenant
              </a>

              <a
                href="#fonctionnement"
                className="rounded-full border border-white/20 px-8 py-4 font-semibold text-white transition hover:bg-white/10"
              >
                Voir comment ça marche
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[1.5rem] bg-slate-900 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Alerte WhatsApp</p>
                  <h2 className="text-xl font-semibold">Nouvelle promotion</h2>
                </div>
                <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-sm text-emerald-300">
                  -35%
                </span>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-emerald-400 p-4 text-slate-950">
                  <p className="font-semibold">Bonjour 👋</p>
                  <p className="mt-2 text-sm">
                    Nouvelle promo chez SuperMarket Plus : huile, riz et
                    produits alimentaires en réduction cette semaine.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-slate-300">Magasin</p>
                  <p className="font-semibold">SuperMarket Plus</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-sm text-slate-300">Catégorie</p>
                    <p className="font-semibold">Alimentation</p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-sm text-slate-300">Validité</p>
                    <p className="font-semibold">7 jours</p>
                  </div>
                </div>

                <a
                  href="/register"
                  className="flex w-full justify-center rounded-full bg-white px-5 py-3 font-semibold text-slate-950"
                >
                  Voir l’offre
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="fonctionnement" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
              Simple et efficace
            </p>
            <h2 className="mt-4 text-4xl font-bold md:text-5xl">
              Comment ça marche ?
            </h2>
            <p className="mt-5 text-slate-300">
              En quelques minutes, l’utilisateur configure ses préférences et
              reçoit ensuite les offres qui l’intéressent vraiment.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-[2rem] border border-white/10 bg-white/5 p-8"
              >
                <span className="text-sm font-bold text-emerald-300">
                  {step.number}
                </span>
                <h3 className="mt-6 text-2xl font-semibold">{step.title}</h3>
                <p className="mt-4 leading-7 text-slate-300">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="avantages" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
                Avantages
              </p>
              <h2 className="mt-4 text-4xl font-bold md:text-5xl">
                Une plateforme pensée pour les consommateurs modernes.
              </h2>
              <p className="mt-5 leading-8 text-slate-300">
                PromoPulse centralise les promotions, filtre les offres et
                transforme la recherche de bons plans en une expérience simple,
                rapide et personnalisée.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[2rem] border border-white/10 bg-white/5 p-7"
                >
                  <div className="mb-5 h-10 w-10 rounded-2xl bg-emerald-400/20" />
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-slate-300">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="tarifs" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
              Tarifs
            </p>
            <h2 className="mt-4 text-4xl font-bold md:text-5xl">
              Des formules adaptées à chaque utilisateur.
            </h2>
            <p className="mt-5 text-slate-300">
              Les tarifs seront ajustés après la phase pilote. La structure
              ci-dessous sert de base pour le modèle économique.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-[2rem] border p-8 ${
                  plan.highlighted
                    ? "border-emerald-400 bg-emerald-400 text-slate-950"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <h3 className="text-2xl font-bold">{plan.name}</h3>

                <p
                  className={`mt-3 ${
                    plan.highlighted ? "text-slate-800" : "text-slate-300"
                  }`}
                >
                  {plan.description}
                </p>

                <p className="mt-8 text-4xl font-bold">{plan.price}</p>

                <ul className="mt-8 space-y-4">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span>✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="/register"
                  className={`mt-8 inline-flex w-full justify-center rounded-full px-6 py-3 font-semibold ${
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

      <section id="faq" className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
              FAQ
            </p>
            <h2 className="mt-4 text-4xl font-bold md:text-5xl">
              Questions fréquentes
            </h2>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <h3 className="text-lg font-semibold">{faq.question}</h3>
                <p className="mt-3 leading-7 text-slate-300">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center">
          <h2 className="text-4xl font-bold">
            Prêt à suivre vos meilleures promotions ?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-300">
            PromoPulse démarre avec une première version simple : choix des
            magasins, consultation des offres et alertes personnalisées.
          </p>

          <a
            href="/register"
            className="mt-8 inline-flex rounded-full bg-emerald-400 px-8 py-4 font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Créer mon compte
          </a>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-400 md:flex-row">
          <p>© 2026 PromoPulse. Tous droits réservés.</p>

          <div className="flex gap-6">
            <a href="#" className="hover:text-white">
              Confidentialité
            </a>
            <a href="#" className="hover:text-white">
              Conditions
            </a>
            <a href="#" className="hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}