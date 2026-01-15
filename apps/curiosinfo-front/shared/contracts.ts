import { z } from "zod";

// =========================
// TYPESCRIPT TYPES (client-friendly)
// =========================

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
  excerpt?: string | null;
  published_at: string; // ISO string côté API
  created_at?: string;  // optionnel côté API
};

export type Topic = {
  id: number;
  slug: string;
  title: string;
  summary?: string | null;
  angleNote?: string | null;
  start_at?: string | null;
  end_at?: string | null;
};

export type ArticleWithActor = Article & { actor: Actor };

export type TopicWithDetails = Topic & {
  articles: ArticleWithActor[];
  actorInTopic: Actor[];
};

// =========================
// ZOD CONTRACT SCHEMAS (API <-> client)
// =========================

export const ActorSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  actor_type: z.string(),
  libAutor: z.number(),
  indivCol: z.number(),
  natioMon: z.number(),
  progCons: z.number(),
});

export const TopicSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  angleNote: z.string().nullable().optional(),
  start_at: z.string().nullable().optional(),
  end_at: z.string().nullable().optional(),
});

export const ArticleSchema = z.object({
  id: z.number(),
  topicId: z.number(),
  actorId: z.number(),
  url: z.string().url(),
  title: z.string(),
  excerpt: z.string().nullable().optional(),
  published_at: z.coerce.string(), // ISO date string
  created_at: z.coerce.string().optional(),
});

export const ArticleWithActorSchema = ArticleSchema.extend({
  actor: ActorSchema,
});

export const TopicWithDetailsSchema = TopicSchema.extend({
  articles: z.array(ArticleWithActorSchema),
  actorInTopic: z.array(ActorSchema),
});

// =========================
// REQUEST SCHEMAS (input API)
// =========================

export const CreateTopicRequestSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  angleNote: z.string().nullable().optional(),
  start_at: z.coerce.date().nullable().optional(),
  end_at: z.coerce.date().nullable().optional(),
});

export const UpdateTopicRequestSchema = CreateTopicRequestSchema.partial();

export const UpdateActorRequestSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  actor_type: z.string().optional(),
  libAutor: z.number().optional(),
  indivCol: z.number().optional(),
  natioMon: z.number().optional(),
  progCons: z.number().optional(),
}).partial();

export const IngestResultSchema = z.object({
  newArticles: z.number(),
  errors: z.number(),
  details: z.array(z.string()),
});

/*export type Actor = {
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
};*/
