import { pgTable, text, serial, integer, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =======================
// TABLES
// =======================

export const actor = pgTable("actor", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  feed_url: text("feed_url").notNull(),
  actor_type: text("actor_type").notNull(),

  libAutor: doublePrecision("lib_autor").default(0).notNull(),
  indivCol: doublePrecision("indiv_col").default(0).notNull(),
  natioMon: doublePrecision("natio_mon").default(0).notNull(),
  progCons: doublePrecision("prog_cons").default(0).notNull(),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  angleNote: text("angle_note"),
  start_at: timestamp("start_at"),
  end_at: timestamp("end_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => topics.id).notNull(),
  actorId: integer("actor_id").references(() => actor.id).notNull(),
  url: text("url").notNull().unique(),
  urlHash: text("url_hash").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  published_at: timestamp("published_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// =======================
// RELATIONS
// =======================

export const actorRelations = relations(actor, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  actor: one(actor, { fields: [articles.actorId], references: [actor.id] }),
  topic: one(topics, { fields: [articles.topicId], references: [topics.id] }),
}));

export const topicsRelations = relations(topics, ({ many }) => ({
  articles: many(articles),
}));

// =======================
// INSERT SCHEMAS (SERVER SIDE VALIDATION)
// =======================

export const insertActorSchema = createInsertSchema(actor).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  created_at: true,
});

// Request types
export type CreateTopicRequest = InsertTopic;
export type UpdateTopicRequest = Partial<InsertTopic>;
export type UpdateActorRequest = Partial<InsertActor>;
// Extended Types for Responses
export type ArticleWithActor = Article & { actor: Actor };
export type TopicWithDetails = Topic & { 
  //topicArticles: TopicArticle[];
  actorInTopic: Actor[]; // Actor that have articles in this topic
};

// =======================
// TYPES (SERVER SIDE)
// =======================

export type Actor = typeof actor.$inferSelect;
export type InsertActor = z.infer<typeof insertActorSchema>;

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;

export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
