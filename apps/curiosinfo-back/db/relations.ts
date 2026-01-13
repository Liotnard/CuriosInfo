//meant to receive relations from schema.ts in the same folder

import { relations } from "drizzle-orm";
import { actor } from "./schema";
import { articles } from "./schema";
import { topics } from "./schema";

export const actorRelations = relations(actor, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  actor: one(actor, { fields: [articles.actorId], references: [actor.id] }),
  topic: one(topics, { fields: [articles.topicId], references: [topics.id] }),
}));
