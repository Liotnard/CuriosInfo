// new schema.ts in apps\curiosinfo-back\db\schema.ts
/*import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, unique, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Actor outlets (Le Monde, etc.)
export const actor = pgTable("actor", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  feed_url: text("feed_url").notNull(), // RSS/Atom feed URL
  actor_type: text("actor_type").notNull(), // "presse éditoriale", TV/radio, Presse indépendante, "personnalité", or "influenceur"
  // Four political/editorial axes
  libAutor: doublePrecision("lib_autor").default(0).notNull(), // Libertaire (-10) ↔ Autoritaire (+10)
  indivCol: doublePrecision("indiv_col").default(0).notNull(), // Collectiviste (-10) ↔ Individualiste (+10)
  natioMon: doublePrecision("natio_mon").default(0).notNull(), // Nationaliste (-10) ↔ Mondialiste (+10)
  progCons: doublePrecision("prog_cons").default(0).notNull(), // Conservateur (-10) ↔ Progressiste (+10)
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Editorial Topics (Sujets)
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"), // Synthèse froide
  angleNote: text("angle_note"), // Micro-analyse
  start_at: timestamp("start_at"),
  end_at: timestamp("end_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Articles from RSS feeds
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => topics.id).notNull(),
  actorId: integer("actor_id").references(() => actor.id).notNull(),
  url: text("url").notNull().unique(),
  urlHash: text("url_hash").notNull().unique(), // SHA256 of canonical URL
  title: text("title").notNull(), // Article title
  excerpt: text("excerpt"), // RSS description ou citation
  published_at: timestamp("published_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// === RELATIONS ===

export const actorRelations = relations(actor, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  actor: one(actor, {
    fields: [articles.actorId],
    references: [actor.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertActorSchema = createInsertSchema(actor).omit({ id: true, created_at: true, updated_at: true });
export const insertTopicSchema = createInsertSchema(topics).omit({ id: true, created_at: true, updated_at: true });
export const insertArticleSchema = createInsertSchema(articles).omit({ id: true, created_at: true });
//export const insertTopicArticleSchema = createInsertSchema(topicArticles).omit({ id: true, created_at: true });

// === EXPLICIT API CONTRACT TYPES ===

// Base types
export type Actor = typeof actor.$inferSelect;
export type InsertActor = z.infer<typeof insertActorSchema>;

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;

export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;


//export type TopicArticle = typeof topicArticles.$inferSelect;
//export type InsertTopicArticle = z.infer<typeof insertTopicArticleSchema>;

// Extended Types for Responses
export type ArticleWithActor = Article & { actor: Actor };
export type TopicWithDetails = Topic & { 
  //topicArticles: TopicArticle[];
  actorInTopic: Actor[]; // Actor that have articles in this topic
};

// Request types
export type CreateTopicRequest = InsertTopic;
export type UpdateTopicRequest = Partial<InsertTopic>;
export type UpdateActorRequest = Partial<InsertActor>;

// Ingestion
export type IngestResult = {
  newArticles: number;
  errors: number;
  details: string[];
};
*/
