// Shared API contract and helpers
import { z } from 'zod';
import { ActorSchema, TopicSchema, TopicWithDetailsSchema, ArticleWithActorSchema, CreateTopicRequestSchema, UpdateTopicRequestSchema, UpdateActorRequestSchema, IngestResultSchema, } from "./contracts";

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
  topics: {
    list: {
      method: 'GET' as const,
      path: '/api/topics',
      responses: {
        200: z.array(TopicSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/topics/:slug',
      responses: {
        200: TopicWithDetailsSchema,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/topics',
      input: CreateTopicRequestSchema,
      responses: {
        201: TopicSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/topics/:id',
      input: UpdateTopicRequestSchema,
      responses: {
        200: TopicSchema,
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
        200: z.array(ActorSchema),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/actor/:id',
      input: UpdateActorRequestSchema,
      responses: {
        200: ActorSchema,
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
        200: z.array(ArticleWithActorSchema),
        401: errorSchemas.unauthorized,
      },
    },
    ingest: {
      method: 'POST' as const,
      path: '/api/admin/ingest',
      responses: {
        200: IngestResultSchema,
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
  }
  return url;
}