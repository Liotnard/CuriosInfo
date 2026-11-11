import { useEffect } from "react";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { ACTOR_AXES, ACTOR_CATEGORIES } from "@shared/actors";

export default function FAQ() {
  useEffect(() => {
    const reveal = () => {
      const id = window.location.hash.slice(1);
      const item = document.getElementById(id);
      if (item instanceof HTMLDetailsElement) { item.open = true;requestAnimationFrame(() => item.scrollIntoView({ block: "start" })); }
    };
    reveal();window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);
  return <div className="min-h-screen bg-background"><Header /><main className="container mx-auto max-w-4xl px-4 py-10 sm:py-12">
    <header className="mb-10"><p className="text-sm text-primary font-medium mb-2">Comprendre CuriosInfo</p><h1 className="text-4xl font-display font-bold mb-4">Questions fréquentes</h1><p className="text-muted-foreground">Ce que montrent les cartes, comment lire les notes et quelles sont les limites de cette lecture de l’actualité.</p></header>
    <div className="space-y-4">
      <Question id="objectif" title="Que montre CuriosInfo ?" open>
        <p>CuriosInfo rapproche les publications sur un même sujet pour montrer qui en parle et donner un aperçu des convergences ou divergences. Les cartes et les graphiques s’appuient sur les publications liées au dossier. Un acteur absent n’est donc pas nécessairement silencieux : sa publication peut manquer à notre collecte.</p>
      </Question>
      <Question id="axes" title="Que signifient Lib-Auth, Col-Ind, Nat-Mond et Prog-Cons ?" open>
        <p>Les notes vont de −10 à +10. Les deux cartes affichent les quatre dimensions ci-dessous. Un score proche de zéro indique une position intermédiaire sur l’axe ; il ne constitue pas un certificat de neutralité.</p>
        <div className="my-4 overflow-x-auto"><table className="w-full text-sm text-left"><caption className="sr-only">Sens des quatre échelles de positionnement</caption><thead><tr className="border-b"><th className="py-2 pr-3">Axe</th><th className="py-2 pr-3">−10</th><th className="py-2">+10</th></tr></thead><tbody>{ACTOR_AXES.map(axis => <tr key={axis.key} className="border-b last:border-0"><th className="py-3 pr-3 align-top font-medium">{axis.short}</th><td className="py-3 pr-3 align-top">{axis.low}</td><td className="py-3 align-top">{axis.high}</td></tr>)}</tbody></table></div>
        <ul className="space-y-2">{ACTOR_AXES.map(axis => <li key={axis.key}><strong>{axis.short} :</strong> {axis.description}</li>)}</ul>
      </Question>
      <Question id="attribution" title="Comment les notes sont-elles calculées ?">
        <p>Actuellement, ce sont des positionnements éditoriaux renseignés dans notre base, et non le résultat d’un calcul automatique sur les articles. Le site les affiche sur une échelle commune. Les publications d’un sujet déterminent qui apparaît sur sa carte et combien de contenus sont liés à chaque acteur ; elles ne recalculent pas sa position.</p>
        <p>Ces notes comportent une part d’appréciation et peuvent être discutées. La documentation détaillée des critères, des sources et des justifications de chaque note reste à compléter. Une décimale ne doit pas être interprétée comme une précision scientifique.</p>
      </Question>
      <Question id="gauche-droite" title="Pourquoi ne pas utiliser simplement l’axe gauche–droite ?">
        <p>Le repère gauche–droite est utile, mais il agrège plusieurs questions. Deux acteurs proches sur des enjeux économiques peuvent diverger sur les libertés publiques, les traditions ou l’ouverture internationale. Quatre dimensions rendent ces écarts visibles, sans prétendre résumer entièrement une personne ou une rédaction.</p>
        <p>Les cartes proposent donc une grille de lecture complémentaire. Elles n’attribuent pas une vérité à un camp et ne remplacent pas la lecture des publications.</p>
      </Question>
      <Question id="couleurs" title="À quoi correspondent les couleurs ?">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">{ACTOR_CATEGORIES.map(c => <li key={c.type} className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />{c.label}</li>)}</ul>
        <p>Les couleurs indiquent le type d’acteur, pas son opinion. Les mêmes couleurs sont utilisées sur les deux cartes et dans les sources documentées par type.</p>
      </Question>
      <Question id="independance" title="Qu’entend-on par presse indépendante ?">
        <p>Nous examinons ensemble le financement, la propriété et l’autonomie éditoriale. La dépendance à un propriétaire, à des annonceurs ou à un financeur important peut peser sur les choix d’une rédaction. Les garanties de gouvernance et la diversité des ressources comptent autant qu’une déclaration d’indépendance.</p>
        <p>L’onglet présente les premières informations documentées et leurs sources : qui détient le média, comment il se finance et quelles protections il annonce. Les fiches sans documentation restent à examiner. Ce classement n’est ni une garantie de fiabilité, ni une preuve que tous les autres médias reçoivent des consignes de leurs financeurs.</p>
        <Link href="/independants" className="text-primary underline underline-offset-4">Consulter la presse indépendante</Link>
      </Question>
      <Question id="utilisation" title="Comment interagir avec les cartes ?">
        <p>Survolez un point pour afficher son nom et son nombre de publications. Sur ordinateur comme sur téléphone, cliquez ou touchez le point pour garder sa fiche ouverte et retrouver le même acteur sur les deux cartes. Le cadre se place du côté disposant de place. Cliquez ailleurs, cliquez à nouveau sur le point ou appuyez sur Échap pour fermer la sélection.</p>
      </Question>
      <Question id="couverture" title="Le nombre de publications mesure-t-il le soutien ou la fiabilité ?">
        <p>Non. Il compte les contenus documentés dans le dossier, sans signifier que leur auteur soutient une position. Plusieurs médias peuvent reprendre une même dépêche ; plusieurs liens ne représentent donc pas toujours plusieurs enquêtes indépendantes. Les synthèses et les angles de traitement doivent attribuer les propos et distinguer les faits des interprétations.</p>
      </Question>
    </div>
  </main></div>;
}
function Question({ id, title, children, open = false }: { id: string; title: string; children: React.ReactNode; open?: boolean }) {
  return <details id={id} open={open} className="scroll-mt-24 rounded-2xl border bg-card p-5 sm:p-6"><summary className="cursor-pointer font-display font-bold text-lg leading-snug">{title}</summary><div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div></details>;
}
