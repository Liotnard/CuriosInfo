import fs from "fs";
import path from "path";
import {
  actor,
  articles,
  topics,
  type Actor,
  type InsertActor,
  type UpdateActorRequest,
  type Article,
  type InsertArticle,
  type Topic,
  type InsertTopic,
  type UpdateTopicRequest,
  type TopicWithDetails,
  type ArticleWithActor,
} from "../db/schema";

import { eq, like, desc, and, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // Actor
  getAllActor(): Promise<Actor[]>;
  getActor(id: number): Promise<Actor | undefined>;
  updateActor(id: number, updates: UpdateActorRequest): Promise<Actor>;
  createActor(actor: InsertActor): Promise<Actor>; // For seeding
  
  // Articles
  getArticleByHash(hash: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  searchArticles(query?: string, actorId?: number): Promise<ArticleWithActor[]>;
  
  // Topics
  getAllTopics(): Promise<Topic[]>;
  getTopic(id: number): Promise<Topic | undefined>;
  getTopicBySlug(slug: string): Promise<TopicWithDetails | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: number, updates: UpdateTopicRequest): Promise<Topic>;
  deleteTopic(id: number): Promise<void>;
  
  // Topic Articles
  addArticleToTopic(topicId: number, articleId: number): Promise<void>;
  removeArticleFromTopic(topicId: number, articleId: number): Promise<void>;
}

// Simple file-based JSON storage fallback for local development.
class FileStorage implements IStorage {
  dir: string;
  constructor(dir?: string) {
    const env = dir || process.env.JSON_DB_DIR;
    if (env) {
      this.dir = env;
      return;
    }

    // Try a few likely relative locations for the DB directory and pick the first that exists.
    const candidates = [
      path.resolve(process.cwd(), "data"),
      path.resolve(process.cwd(), "../data"),
      path.resolve(process.cwd(), "..", "data"),
      path.resolve(process.cwd(), "..", "..", "data"),
      path.resolve(process.cwd(), "..", "..", "..", "data"),
    ];

    const found = candidates.find((c) => fs.existsSync(c));
    this.dir = found || path.resolve(process.cwd());
  }

  private file(name: string) {
    return path.join(this.dir, name);
  }

  private async read<T>(name: string): Promise<T> {
    const p = this.file(name);
    const content = await fs.promises.readFile(p, "utf-8");
    return JSON.parse(content) as T;
  }

  private async write<T>(name: string, data: T): Promise<void> {
    const p = this.file(name);
    await fs.promises.writeFile(p, JSON.stringify(data, null, 2), "utf-8");
  }

  // Helper to ensure dates are proper
  private parseDateFields<T extends any[]>(items: T, dateFields: string[] = []) {
    return items.map((it: any) => {
      for (const f of dateFields) {
        if (it[f]) it[f] = new Date(it[f]);
      }
      return it;
    }) as T;
  }

  // === MEDIA ===
  async getAllActor(): Promise<Actor[]> {
    const m = await this.read<Actor[]>("actors.json");
    return this.parseDateFields(m, ["created_at", "updated_at"]);
  }

  async getActor(id: number): Promise<Actor | undefined> {
    const list = await this.getAllActor();
    return list.find((m) => m.id === id);
  }

  async updateActor(id: number, updates: UpdateActorRequest): Promise<Actor> {
    const list = await this.read<Actor[]>("actors.json");
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Actor not found");
    const updated = { ...list[idx], ...updates, updated_at: new Date().toISOString() } as any;
    list[idx] = updated;
    await this.write("actors.json", list);
    return updated as Actor;
  }

  async createActor(item: InsertActor): Promise<Actor> {
    const list = await this.read<Actor[]>("actors.json");
    const id = (list.map((m) => m.id || 0).reduce((a, b) => Math.max(a, b), 0) || 0) + 1;
    const created: any = { ...item, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    list.push(created);
    await this.write("actors.json", list);
    return created as Actor;
  }

  // === ARTICLES ===
  async getArticleByHash(hash: string): Promise<Article | undefined> {
    const list = await this.read<Article[]>("articles.json");
    return list.find((a) => a.urlHash === hash);
  }

  async createArticle(item: InsertArticle): Promise<Article> {
    const list = await this.read<Article[]>("articles.json");
    const exists = list.find((a) => a.urlHash === item.urlHash);
    if (exists) return exists;
    const id = (list.map((a) => a.id || 0).reduce((a, b) => Math.max(a, b), 0) || 0) + 1;
    const created: any = { ...item, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    // ensure published_at is stored as ISO
    if (created.published_at instanceof Date) created.published_at = created.published_at.toISOString();
    list.push(created);
    await this.write("articles.json", list);
    return created as Article;
  }

  async searchArticles(query?: string, actorId?: number): Promise<ArticleWithActor[]> {
    const arts = await this.read<Article[]>("articles.json");
    const actorList = await this.read<Actor[]>("actors.json");
    let results = arts.slice();
    if (query) {
      const q = query.toLowerCase();
      results = results.filter((a) => (a.title || "").toLowerCase().includes(q));
    }
    if (actorId) {
      results = results.filter((a) => a.actorId === actorId);
    }
    results.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    results = results.slice(0, 50);
    return results.map((a) => ({ ...a, actor: actorList.find((m) => m.id === a.actorId) } as any));
  }

  // === TOPICS ===
  async getAllTopics(): Promise<Topic[]> {
    const raw = await this.read<any[]>("topics.json");
    const mapped = raw.map((it: any) => {
      return {
        ...it,
        // normalize snake_case -> camelCase if present
        angleNote: it.angleNote ?? it.angle_note ?? null,
        start_at: it.start_at ?? it.start_at ?? null,
        end_at: it.end_at ?? it.end_at ?? null,
        created_at: it.created_at ?? it.created_at ?? null,
        updated_at: it.updated_at ?? it.updated_at ?? null,
      } as any;
    });
    return this.parseDateFields(mapped, ["created_at", "updated_at", "start_at", "end_at"]);
  }

  async getTopic(id: number): Promise<Topic | undefined> {
    const list = await this.getAllTopics();
    return list.find((t) => t.id === id);
  }

  async getTopicBySlug(slug: string): Promise<TopicWithDetails | undefined> {
    const topicsList = await this.read<any[]>("topics.json");
    const raw = topicsList.find((x) => x.slug === slug);
    if (!raw) return undefined;

    // Normalize topic fields (snake_case -> camelCase)
    const t: any = {
      ...raw,
      angleNote: raw.angleNote ?? raw.angle_note ?? null,
      start_at: raw.start_at ?? raw.start_at ?? null,
      end_at: raw.end_at ?? raw.end_at ?? null,
      created_at: raw.created_at ?? raw.created_at ?? null,
      updated_at: raw.updated_at ?? raw.updated_at ?? null,
    };

    // Read canonical articles file and derive topic-related view
    const allArticles = await this.read<any[]>("articles.json");
    const allActor = await this.read<Actor[]>("actors.json");
    const arts = this.parseDateFields(allArticles.filter((a) => a.topicId === t.id), ["published_at", "created_at"] as string[]);
    const actorIds = arts.map((a) => a.actorId).filter((v: any, i: number, arr: any[]) => arr.indexOf(v) === i);
    const actorInTopic = allActor.filter((m) => actorIds.includes(m.id));

    // Parse date fields on topic
    const [normalizedTopic] = this.parseDateFields([t], ["created_at", "updated_at", "start_at", "end_at"] as string[]);

    // Return both legacy `topicArticles` and modern `articles` keys so callers work either way
    return { ...normalizedTopic, topicArticles: arts, articles: arts, actorInTopic } as any;
  }

  async createTopic(item: InsertTopic): Promise<Topic> {
    const list = await this.read<Topic[]>("topics.json");
    const id = (list.map((m) => m.id || 0).reduce((a, b) => Math.max(a, b), 0) || 0) + 1;
    const created: any = { ...item, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    list.push(created);
    await this.write("topics.json", list);
    return created as Topic;
  }

  async updateTopic(id: number, updates: UpdateTopicRequest): Promise<Topic> {
    const list = await this.read<Topic[]>("topics.json");
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Topic not found");
    const updated = { ...list[idx], ...updates, updated_at: new Date().toISOString() } as any;
    list[idx] = updated;
    await this.write("topics.json", list);
    return updated as Topic;
  }

  async deleteTopic(id: number): Promise<void> {
    const topicsList = await this.read<Topic[]>("topics.json");
    const filtered = topicsList.filter((t) => t.id !== id);
    await this.write("topics.json", filtered);
    // For file-backed store, unlink articles that referenced this topic by removing their `topicId`.
    const allArticles = await this.read<any[]>("articles.json");
    const updated = allArticles.map((a) => (a.topicId === id ? { ...a, topicId: undefined } : a));
    await this.write("articles.json", updated);
  }

  async addArticleToTopic(_topicId: number, _articleId: number): Promise<void> {
    // Legacy - no-op for file store
  }

  async removeArticleFromTopic(_topicId: number, _articleId: number): Promise<void> {
    // Legacy - no-op for file store
  }
}

// Choose storage backend: file-based if USE_JSON_DB=true, otherwise assume Postgres DatabaseStorage.
let storageImpl: IStorage;
if (process.env.USE_JSON_DB === "true" || !process.env.DATABASE_URL) {
  storageImpl = new FileStorage();
} else {
  // Database-backed storage: lazily import the `db` module inside methods
  class DatabaseStorage implements IStorage {
    private async getDb() {
      const mod = await import("./db");
      return mod.db;
    }

    // === MEDIA ===
    async getAllActor(): Promise<Actor[]> {
      const db = await this.getDb();
      return await db.select().from(actor);
    }

    async getActor(id: number): Promise<Actor | undefined> {
      const db = await this.getDb();
      const [item] = await db.select().from(actor).where(eq(actor.id, id));
      return item;
    }

    async updateActor(id: number, updates: UpdateActorRequest): Promise<Actor> {
      const db = await this.getDb();
      const [updated] = await db.update(actor)
        .set({ ...updates, updated_at: new Date() })
        .where(eq(actor.id, id))
        .returning();
      return updated;
    }

    async createActor(item: InsertActor): Promise<Actor> {
      const db = await this.getDb();
      const [created] = await db.insert(actor).values(item).returning();
      return created;
    }

    // === ARTICLES ===
    async getArticleByHash(hash: string): Promise<Article | undefined> {
      const db = await this.getDb();
      const [item] = await db.select().from(articles).where(eq(articles.urlHash, hash));
      return item;
    }

    async createArticle(item: InsertArticle): Promise<Article> {
      const db = await this.getDb();
      const [created] = await db.insert(articles).values(item).onConflictDoNothing().returning();
      if (!created) {
        return (await this.getArticleByHash(item.urlHash))!;
      }
      return created;
    }

    async searchArticles(query?: string, actorId?: number): Promise<ArticleWithActor[]> {
      const db = await this.getDb();
      let conditions: any[] = [];
      if (query) conditions.push(like(articles.title, `%${query}%`));
      if (actorId) conditions.push(eq(articles.actorId, actorId));

      return await db.query.articles.findMany({
        where: conditions.length ? and(...conditions) : undefined,
        with: { actor: true },
        orderBy: desc(articles.published_at),
        limit: 50,
      });
    }

    // === TOPICS ===
    async getAllTopics(): Promise<Topic[]> {
      const db = await this.getDb();
      return await db.select().from(topics).orderBy(desc(topics.created_at));
    }

    async getTopic(id: number): Promise<Topic | undefined> {
      const db = await this.getDb();
      const [item] = await db.select().from(topics).where(eq(topics.id, id));
      return item;
    }

    async getTopicBySlug(slug: string): Promise<TopicWithDetails | undefined> {
      const db = await this.getDb();
      const [topic] = await db.select().from(topics).where(eq(topics.slug, slug));
      if (!topic) return undefined;

      // Read articles linked to this topic (new schema) instead of legacy topic_articles
      const topicArts = await db.select()
        .from(articles)
        .where(eq(articles.topicId, topic.id));

      const allActor = await db.select().from(actor);

      const actorIds = topicArts.map((a: any) => a.actorId).filter((v: any, i: number, arr: any[]) => arr.indexOf(v) === i);
      const actorInTopic = allActor.filter((m: any) => actorIds.includes(m.id));

      // Normalize topic fields in case DB returns snake_case keys (defensive)
      const normalizedTopic: any = {
        ...topic,
        angleNote: (topic as any).angleNote ?? (topic as any).angle_note ?? null,
        start_at: (topic as any).start_at ?? (topic as any).start_at ?? null,
        end_at: (topic as any).end_at ?? (topic as any).end_at ?? null,
        created_at: (topic as any).created_at ?? (topic as any).created_at ?? null,
        updated_at: (topic as any).updated_at ?? (topic as any).updated_at ?? null,
      };

      return {
        ...normalizedTopic,
        topicArticles: topicArts,
        articles: topicArts,
        actorInTopic,
      } as any;
    }

    async createTopic(item: InsertTopic): Promise<Topic> {
      const db = await this.getDb();
      const [created] = await db.insert(topics).values(item).returning();
      return created;
    }

    async updateTopic(id: number, updates: UpdateTopicRequest): Promise<Topic> {
      const db = await this.getDb();
      const [updated] = await db.update(topics)
        .set({ ...updates, updated_at: new Date() })
        .where(eq(topics.id, id))
        .returning();
      return updated;
    }

    async deleteTopic(id: number): Promise<void> {
      const db = await this.getDb();
      //await db.delete(topicArticles).where(eq(topicArticles.topicId, id));
      await db.delete(topics).where(eq(topics.id, id));
    }

    async addArticleToTopic(topicId: number, articleId: number): Promise<void> {
      // Legacy method - no longer used with new schema
    }

    async removeArticleFromTopic(topicId: number, articleId: number): Promise<void> {
      // Legacy method - no longer used with new schema
    }
  }

  storageImpl = new DatabaseStorage();
}

export const storage = storageImpl;
