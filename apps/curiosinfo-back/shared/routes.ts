// everything commented below is legacy, while "//routes patch" is new code
 

import { z } from 'zod';
//import { insertTopicSchema, insertActorSchema, actor, topics, articles } from './schema';
import { ActorSchema, TopicSchema, TopicWithDetailsSchema, ArticleWithActorSchema, CreateTopicRequestSchema, UpdateTopicRequestSchema, UpdateActorRequestSchema, IngestResultSchema, } from "./contracts"; //routes patch

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  // Public Routes
  topics: {
    list: {
      method: 'GET' as const,
      path: '/api/topics',
      responses: {
        200: z.array(TopicSchema), //z.array(z.custom<typeof topics.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/topics/:slug',
      responses: {
        200: TopicWithDetailsSchema /*z.custom<typeof topics.$inferSelect & { 
          articles: (typeof articles.$inferSelect & { actor: typeof actor.$inferSelect })[],
          actorInTopic: typeof actor.$inferSelect[]
        }>()*/,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/topics',
      input: CreateTopicRequestSchema, //insertTopicSchema,
      responses: {
        201: TopicSchema, //z.custom<typeof topics.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/topics/:id',
      input: UpdateTopicRequestSchema, //insertTopicSchema.partial(),
      responses: {
        200: TopicSchema, //z.custom<typeof topics.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/topics/:id',
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    // Linking articles
    linkArticle: {
      method: 'POST' as const,
      path: '/api/topics/:id/articles',
      input: z.object({ articleId: z.number() }),
      responses: {
        201: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    unlinkArticle: {
      method: 'DELETE' as const,
      path: '/api/topics/:id/articles/:articleId',
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  
  actor: {
    list: {
      method: 'GET' as const,
      path: '/api/actor',
      responses: {
        200: z.array(ActorSchema), //z.array(z.custom<typeof actor.$inferSelect>()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/actor/:id',
      input: UpdateActorRequestSchema, //insertActorSchema.partial(),
      responses: {
        200: ActorSchema, //z.custom<typeof actor.$inferSelect>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },

  admin: {
    searchArticles: {
      method: 'GET' as const,
      path: '/api/admin/articles',
      input: z.object({
        search: z.string().optional(),
        actorId: z.coerce.number().optional(),
      }),
      responses: {
        200: z.array(ArticleWithActorSchema), //z.array(z.custom<typeof articles.$inferSelect & { actor: typeof actor.$inferSelect }>()),
        401: errorSchemas.unauthorized,
      },
    },
    ingest: {
      method: 'POST' as const,
      path: '/api/admin/ingest',
      responses: {
        200: IngestResultSchema, /*z.object({
          newArticles: z.number(),
          errors: z.number(),
          details: z.array(z.string()),
        }),*/
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, String(value));
    }
    /*Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });*/
  }
  return url;
}
