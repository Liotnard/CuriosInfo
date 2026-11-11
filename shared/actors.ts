export const ACTOR_CATEGORIES = [
  { type: "presse", label: "Presse éditoriale", color: "hsl(44, 79%, 46%)" },
  { type: "audiovisuel", label: "TV / Radio", color: "hsl(197, 88%, 48%)" },
  { type: "independants", label: "Presse Indépendante", color: "hsl(300, 80%, 50%)" },
  { type: "personnalite", label: "Personnalités", color: "hsl(0, 80%, 50%)" },
  { type: "influenceur", label: "Influenceurs", color: "hsl(103, 93%, 48%)" },
] as const;
export function normalizeActorType(value?: string | null): string {
  const type = (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const aliases: Record<string, string> = {
    presse: "presse", press: "presse", "presse editoriale": "presse",
    audiovisuel: "audiovisuel", audiovisuels: "audiovisuel", audiovisual: "audiovisuel",
    independant: "independants", independants: "independants",
    personnalite: "personnalite", personnalites: "personnalite",
    influenceur: "influenceur", influenceurs: "influenceur", influencer: "influenceur",
  };
  return aliases[type] ?? type;
}
export function actorCategory(value?: string | null) {
  return ACTOR_CATEGORIES.find(c => c.type === normalizeActorType(value)) ?? { type: "autres", label: "Autres", color: "hsl(210, 8%, 45%)" };
}
export const ACTOR_AXES = [
  { key: "libAutor", short: "Lib-Auth", low: "Libertaire", high: "Autoritaire", description: "Place des libertés individuelles face à l’autorité et au contrôle." },
  { key: "indivCol", short: "Col-Ind", low: "Collectiviste", high: "Individualiste", description: "Place des réponses collectives face à l’autonomie et à la responsabilité individuelles." },
  { key: "natioMon", short: "Nat-Mond", low: "Nationaliste", high: "Mondialiste", description: "Priorité donnée au cadre national ou à l’ouverture et aux coopérations internationales." },
  { key: "progCons", short: "Prog-Cons", low: "Progressiste", high: "Conservateur", description: "Rapport au changement social et culturel, et à la préservation des traditions." },
] as const;
export type ActorAxisKey = typeof ACTOR_AXES[number]["key"];

export function floatingLabelPosition(x: number, y: number, width: number, height: number, labelWidth: number, labelHeight: number) {
  const side = x > width / 2 ? "left" : "right";
  const preferred = side === "left" ? x - labelWidth - 14 : x + 14;
  return {
    side,
    left: Math.max(6, Math.min(preferred, width - labelWidth - 6)),
    top: Math.max(6, Math.min(y - labelHeight / 2, height - labelHeight - 6)),
  };
}
