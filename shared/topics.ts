export const TOPIC_CATEGORIES = [
  { value: "politique", label: "Politique" },
  { value: "social", label: "Social" },
  { value: "economie", label: "Économie" },
  { value: "international", label: "International" },
  { value: "environnement", label: "Environnement" },
  { value: "justice", label: "Justice et sécurité" },
  { value: "medias", label: "Médias et information" },
  { value: "societe", label: "Société" },
] as const;
export type TopicCategory = typeof TOPIC_CATEGORIES[number]["value"];
export const TOPIC_CATEGORY_VALUES = TOPIC_CATEGORIES.map(c => c.value) as [TopicCategory, ...TopicCategory[]];
export const categoryLabel = (value: TopicCategory) => TOPIC_CATEGORIES.find(c => c.value === value)!.label;
export const AGE_FILTERS = [
  { value: "all", label: "Toutes les périodes", days: null },
  { value: "day", label: "Dernières 24 heures", days: 1 },
  { value: "week", label: "7 derniers jours", days: 7 },
  { value: "month", label: "30 derniers jours", days: 30 },
  { value: "quarter", label: "90 derniers jours", days: 90 },
] as const;
export type AgeFilter = typeof AGE_FILTERS[number]["value"];
type Overview = { id:number; category:TopicCategory; editorialStatus:"published"|"archived"; articleCount:number; startAt:string|null; created_at:string };
export function topicDate(topic:Pick<Overview,"startAt"|"created_at">) { return Date.parse(topic.startAt ?? topic.created_at); }
export function filterTopics<T extends Overview>(topics:T[],age:AgeFilter,category:TopicCategory|"all",now=Date.now()) {
  const days=AGE_FILTERS.find(f=>f.value===age)!.days;
  return topics.filter(t=>{
    const elapsed=now-topicDate(t);
    return t.editorialStatus==="published"&&(category==="all"||t.category===category)&&(days===null||(elapsed>=0&&elapsed<days*86400000));
  }).sort((a,b)=>topicDate(b)-topicDate(a)||b.id-a.id);
}
export function featuredTopic<T extends Overview>(topics:T[],now=Date.now()):T|undefined {
  return filterTopics(topics,"week","all",now).filter(t=>t.articleCount>0)
    .sort((a,b)=>b.articleCount-a.articleCount||topicDate(b)-topicDate(a)||b.id-a.id)[0];
}
