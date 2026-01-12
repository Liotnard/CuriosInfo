export type Actor = {
  id: number;
  name: string;
  slug: string;
  actor_type: string;
  libAutor: number;
  indivCol: number;
  natioMon: number;
  progCons: number;
};

export type Article = {
  id: number;
  topicId: number;
  actorId: number;
  title: string;
  url: string;
  published_at: string;
};

export type Topic = {
  id: number;
  slug: string;
  title: string;
  summary?: string;
};

export type ArticleWithActor = Article & { actor: Actor };
export type TopicWithDetails = Topic & {
  actorInTopic: Actor[];
};
