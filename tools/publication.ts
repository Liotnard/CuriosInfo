import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ActorSchema, TopicSchema, ArticleSchema } from "../shared/schema";
import { normalizeActor } from "./normalize";
function unique(rows: {id:number;slug?:string}[]) {
  for (const key of ["id", "slug"] as const) {
    const values = rows.map(row => row[key]).filter(v => v !== undefined);
    if (new Set(values).size !== values.length) throw new Error(`Duplicate ${key}`);
  }
}
export async function publishData(source: string, output: string) {
  const read = async (name:string) => JSON.parse(await fs.readFile(path.join(source,name + ".json"),"utf8"));
  const actors = (await read("actors") as any[]).map(raw => ActorSchema.parse(normalizeActor(raw)));
  const topics = (await read("topics") as any[]).map(raw => TopicSchema.parse({...raw, angleNote:raw.angleNote ?? raw.angle_note ?? null,startAt:raw.startAt ?? raw.start_at ?? null,endAt:raw.endAt ?? raw.end_at ?? null, summary:raw.summary ?? null,updatedAt:raw.updatedAt ?? raw.updated_at}));
  const articles = (await read("articles") as any[]).map(raw => ArticleSchema.parse({...raw,topicId:raw.topicId ?? null,excerpt:raw.excerpt ?? null}));
  unique(actors); unique(topics); unique(articles);
  const actorById = new Map(actors.map(a => [a.id,a]));
  const topicIds = new Set(topics.map(t=>t.id));
  for (const a of articles) {
    if (!actorById.has(a.actorId)) throw new Error(`Article ${a.id}: missing actor ${a.actorId}`);
    if (a.topicId !== null && !topicIds.has(a.topicId)) throw new Error(`Article ${a.id}: missing topic ${a.topicId}`);
  }
  // Immutable releases keep already-open browser sessions coherent across publications.
  const version = crypto.randomUUID();
  const release = path.join(output,"releases",version);
  await fs.mkdir(release,{recursive:true});
  const write = (name:string,data:unknown) => fs.writeFile(path.join(release,name),JSON.stringify(data));
  try {
    await fs.mkdir(path.join(release,"topics"));
    await write("actors.json",actors);
    await write("index.json",topics);
    for (const topic of topics) {
      const linked = articles.filter(a=>a.topicId === topic.id);
      const ids = new Set(linked.map(a=>a.actorId));
      await write(`topics/${topic.slug}.json`, {...topic,articles:linked.map(a=>({...a,actor:actorById.get(a.actorId)})),actorInTopic:actors.filter(a=>ids.has(a.id))});
    }
    const temporary = path.join(output, `manifest.${version}.tmp`);
    await fs.writeFile(temporary,JSON.stringify({version,publishedAt:new Date().toISOString()}));
    await fs.rename(temporary,path.join(output,"manifest.json"));
    return {version,actors:actors.length,topics:topics.length,articles:articles.length};
  } catch(error) { await fs.rm(release,{recursive:true,force:true}); throw error; }
}
