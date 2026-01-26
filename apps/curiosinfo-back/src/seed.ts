// apps/curiosinfo-back/src/seed.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "./db";

type ActorJson = {
  id: number;
  name: string;
  slug: string;
  feed_url: string;
  actor_type: string;
  lib_autor?: number | null;
  indiv_col?: number | null;
  natio_mon?: number | null;
  prog_cons?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  confidence?: number | null;
};

type TopicJson = {
  id: number;
  slug: string;
  title: string;
  summary?: string | null;
  angle_note?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ArticleJson = {
  id: number;
  topicId: number;
  actorId: number;
  url: string;
  urlHash: string;
  title: string;
  excerpt?: string | null;
  published_at: string;
  created_at?: string | null;
};

async function hasColumn(table: string, column: string): Promise<boolean> {
  const res: any = await db.execute(sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name = ${column}
    LIMIT 1
  `);
  return Array.isArray(res?.rows) ? res.rows.length > 0 : false;
}

async function main() {
  const dataDir = process.env.DATA_DIR || "/app/data";

  const actorsPath = join(dataDir, "actors.json");
  const topicsPath = join(dataDir, "topics.json");
  const articlesPath = join(dataDir, "articles.json");

  const actors: ActorJson[] = JSON.parse(await readFile(actorsPath, "utf-8"));
  const topics: TopicJson[] = JSON.parse(await readFile(topicsPath, "utf-8"));
  const articles: ArticleJson[] = JSON.parse(await readFile(articlesPath, "utf-8"));

  const actorHasConfidence = await hasColumn("actor", "confidence");

  // 1) TOPICS
  if (topics.length) {
    const values = topics.map((t) => sql`(
      ${t.id},
      ${t.slug},
      ${t.title},
      ${t.summary ?? null},
      ${t.angle_note ?? null},
      ${t.start_at ?? null},
      ${t.end_at ?? null},
      ${t.created_at ?? null},
      ${t.updated_at ?? null}
    )`);

    await db.execute(sql`
      INSERT INTO topics (id, slug, title, summary, angle_note, start_at, end_at, created_at, updated_at)
      VALUES ${sql.join(values, sql`, `)}
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        angle_note = EXCLUDED.angle_note,
        start_at = EXCLUDED.start_at,
        end_at = EXCLUDED.end_at,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
    `);
  }

  // 2) ACTORS
  if (actors.length) {
    const colsBase = [
      "id",
      "name",
      "slug",
      "feed_url",
      "actor_type",
      "lib_autor",
      "indiv_col",
      "natio_mon",
      "prog_cons",
      "created_at",
      "updated_at",
    ];
    const cols = actorHasConfidence ? [...colsBase, "confidence"] : colsBase;

    const values = actors.map((a) => {
      const baseTuple = [
        a.id,
        a.name,
        a.slug,
        a.feed_url,
        a.actor_type,
        a.lib_autor ?? 0,
        a.indiv_col ?? 0,
        a.natio_mon ?? 0,
        a.prog_cons ?? 0,
        a.created_at ?? null,
        a.updated_at ?? null,
      ];

      const tuple = actorHasConfidence ? [...baseTuple, a.confidence ?? null] : baseTuple;

      return sql`(${sql.join(tuple.map((v) => sql`${v}`), sql`, `)})`;
    });

    // Note: construction "tuple" ci-dessus pour éviter d’avoir 2 requêtes quasi identiques.
    // Elle reste paramétrée (pas de string concat dangereuse).

    await db.execute(sql`
      INSERT INTO actor (${sql.raw(cols.join(", "))})
      VALUES ${sql.join(values, sql`, `)}
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        feed_url = EXCLUDED.feed_url,
        actor_type = EXCLUDED.actor_type,
        lib_autor = EXCLUDED.lib_autor,
        indiv_col = EXCLUDED.indiv_col,
        natio_mon = EXCLUDED.natio_mon,
        prog_cons = EXCLUDED.prog_cons,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
        ${actorHasConfidence ? sql`, confidence = EXCLUDED.confidence` : sql``}
    `);
  }

  // 3) ARTICLES (FK -> topics.id et actor.id)
  if (articles.length) {
    const values = articles.map((a) => sql`(
      ${a.topicId},
      ${a.actorId},
      ${a.url},
      ${a.urlHash},
      ${a.title},
      ${a.excerpt ?? null},
      ${a.published_at},
      ${a.created_at ?? null}
    )`);

    await db.execute(sql`
      INSERT INTO articles (id, topic_id, actor_id, url, url_hash, title, excerpt, published_at, created_at)
      VALUES ${sql.join(values, sql`, `)}
      ON CONFLICT (url) DO UPDATE SET
        topic_id = EXCLUDED.topic_id,
        actor_id = EXCLUDED.actor_id,
        url_hash = EXCLUDED.url_hash,
        title = EXCLUDED.title,
        excerpt = EXCLUDED.excerpt,
        published_at = EXCLUDED.published_at,
        created_at = EXCLUDED.created_at
    `);
  }

  // 4) Resynchroniser les séquences SERIAL pour éviter des collisions futures
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('actor','id'), COALESCE((SELECT MAX(id) FROM actor), 1), true);`);
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('topics','id'), COALESCE((SELECT MAX(id) FROM topics), 1), true);`);
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('articles','id'), COALESCE((SELECT MAX(id) FROM articles), 1), true);`);

  const counts: any = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM actor)   AS actor_count,
      (SELECT COUNT(*)::int FROM topics)  AS topics_count,
      (SELECT COUNT(*)::int FROM articles) AS articles_count
  `);

  const row = counts?.rows?.[0];
  console.log("Seed done:", row ?? counts);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
