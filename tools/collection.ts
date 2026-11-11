import {promises as fs} from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {XMLParser} from "fast-xml-parser";
import {z} from "zod";
import {inspectBody,placeholder,platform} from "./source-check";
const httpUrl=z.string().url().refine(s=>/^https?:/.test(s));
export const CandidateSchema=z.object({key:z.string(),actorId:z.number().int().positive(),actor_name:z.string(),feed_url:httpUrl.nullable(),origin:z.enum(["rss","targeted_web_research","social_public_page","youtube_feed"]).default("rss"),url:httpUrl,urlHash:z.string(),title:z.string().min(1),excerpt:z.string().nullable(),published_at:z.string().datetime(),date_basis:z.enum(["published","updated"]),discovered_at:z.string().datetime(),status:z.enum(["pending","accepted","rejected"]).default("pending"),reviewed_at:z.string().datetime().optional(),article_id:z.number().int().positive().optional(),topic_id:z.number().int().positive().optional(),rejection_reason:z.string().optional(),source_profile:httpUrl.optional(),source_platform:z.string().optional(),content_kind:z.enum(["post","video","article"]).optional(),evidence_checked_at:z.string().datetime().optional()});
export type Candidate=z.infer<typeof CandidateSchema>;
export const ConfigSchema=z.object({actorIds:z.array(z.number().int().positive()).min(1),maxAgeDays:z.number().positive().max(365),maxPerSource:z.number().int().positive().max(200),maxNewItems:z.number().int().positive().max(2000),concurrency:z.number().int().positive().max(6)});
const StateSchema=z.object({version:z.literal(1),entries:CandidateSchema.array(),last_run:z.unknown().optional()});
export function canonicalUrl(value:string,base?:string){
 const u=new URL(value,base);
 if(!/^https?:$/.test(u.protocol)||u.username||u.password||placeholder(u.href))throw new Error("Invalid article URL");
 u.hash="";
 for(const k of [...u.searchParams.keys()])if(/^utm_/i.test(k)||["fbclid","gclid","mc_cid","mc_eid"].includes(k.toLowerCase()))u.searchParams.delete(k);
 u.searchParams.sort();return u.href;
}
function text(value:any):string{
 const raw=typeof value==="object"?value?.["#text"]:value;
 return String(raw ?? "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,"").replace(/<[^>]*>/g," ").replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g,s=>({"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&apos;":"'","&nbsp;":" "}[s]!)).replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_s,n)=>{const i=n[0].toLowerCase()==="x"?parseInt(n.slice(1),16):Number(n);return i>0&&i<=0x10ffff?String.fromCodePoint(i):"";}).replace(/\s+/g," ").trim();
}
const list=(v:any):any[]=>v==null?[]:Array.isArray(v)?v:[v];
export function parseFeed(xml:string,base:string){
 if(!["rss","atom"].includes(inspectBody(xml).kind))throw new Error("Response is not a supported RSS/Atom feed");
 const p=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,processEntities:false,parseTagValue:false}).parse(xml);
 const items=list(p.rss?.channel?.item ?? p.feed?.entry ?? p.RDF?.item);
 return items.map(item=>{
  const links=list(item.link);const link=links.find(l=>typeof l==="object"&&(!l["@_rel"]||l["@_rel"]==="alternate")&&(!l["@_type"]||/html/.test(l["@_type"])));
  const guid=typeof item.guid==="string"?item.guid:item.guid?.["#text"];
  const rawUrl=typeof item.link==="string"?item.link:link?.["@_href"] ?? (typeof guid==="string"&&/^https?:\/\//.test(guid)?guid:undefined);
  const rawDate=item.pubDate ?? item.published ?? item.date ?? item.updated;
  let url:string|undefined;try{url=canonicalUrl(String(rawUrl ?? ""),base);}catch{}
  // A missing link must never resolve to the feed itself.
  if(!rawUrl)url=undefined;
  return {url,title:text(item.title).slice(0,500),excerpt:text(item.description ?? item.summary ?? item.group?.description ?? "").slice(0,1000)||null,published_at:String(rawDate ?? ""),date_basis:(item.pubDate||item.published||item.date?"published":"updated") as "published"|"updated"};
 });
}
export async function downloadFeed(url:string){
 const u=new URL(url);
 if(!/^https?:$/.test(u.protocol)||u.username||u.password||placeholder(url)||(platform(url)&&!(u.protocol==="https:"&&u.hostname==="www.youtube.com"&&/^\/(?:xml\/)?feeds\/videos\.xml$/.test(u.pathname)&&/^UC[\w-]{22}$/.test(u.searchParams.get("channel_id")??""))))throw new Error("Source is not a direct feed");
 const response=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{"User-Agent":"CuriosInfo-Collector/1.0 (RSS metadata only)","Accept":"application/rss+xml, application/atom+xml, application/xml"}});
 if(!response.ok){await response.body?.cancel();throw new Error(`HTTP ${response.status}`);}
 const reader=response.body!.getReader();let size=0;const chunks:Uint8Array[]=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000){await reader.cancel();throw new Error("Feed exceeds 2 MB");}chunks.push(value);}
 return {xml:Buffer.concat(chunks).toString("utf8"),url:response.url};
}
export async function collectNews(options:{dataDir:string;collectionDir:string;config:z.infer<typeof ConfigSchema>;dryRun?:boolean;now?:Date;download?:typeof downloadFeed}){
 const config=ConfigSchema.parse(options.config),now=options.now ?? new Date(),download=options.download ?? downloadFeed;
 const actors=JSON.parse(await fs.readFile(path.join(options.dataDir,"actors.json"),"utf8"));
 const articles=JSON.parse(await fs.readFile(path.join(options.dataDir,"articles.json"),"utf8"));
 const selected=config.actorIds.map(id=>{const actor=actors.find((a:any)=>a.id===id);if(!actor)throw new Error(`Unknown actor ${id}`);if(actor.source_qualification?.status!=="feed_verified")throw new Error(`Actor ${id} is not a qualified feed with entries`);return actor;});
 await fs.mkdir(options.collectionDir,{recursive:true});
 const lockPath=path.join(options.collectionDir,"collection.lock");
 const lock=await fs.open(lockPath,"wx").catch(()=>{throw new Error("Collection is already locked. Check for another running collector before removing a stale lock.");});
 try{
  const file=path.join(options.collectionDir,"inbox.json");
  let state:z.infer<typeof StateSchema>={version:1,entries:[]};
  try{state=StateSchema.parse(JSON.parse(await fs.readFile(file,"utf8")));}catch(e:any){if(e.code!=="ENOENT")throw e;}
  const known=new Set<string>();
  for(const a of [...articles,...state.entries]){try{known.add(canonicalUrl(a.url));}catch{} }
  const report:any={started_at:now.toISOString(),dry_run:!!options.dryRun,sources:[],new_items:0,duplicates:0,old_items:0,invalid_items:0,limited_items:0,errors:0};
  const candidates:Candidate[]=[];let cursor=0;
  async function worker(){while(cursor<selected.length){const actor=selected[cursor++];const source:any={actorId:actor.id,name:actor.name,feed_url:actor.feed_url,status:"ok",items:0};
   try{
    const response=await download(actor.feed_url);const items=parseFeed(response.xml,response.url);source.items=items.length;
    const valid:Candidate[]=[];const seenInFeed=new Set<string>();
    for(const item of items){
     const date=new Date(item.published_at);
     if(!item.url||!item.title||!Number.isFinite(date.getTime())||date.getTime()>now.getTime()+86400000){report.invalid_items++;continue;}
     if(date.getTime()<now.getTime()-config.maxAgeDays*86400000){report.old_items++;continue;}
     if(known.has(item.url)||seenInFeed.has(item.url)){report.duplicates++;continue;}
     seenInFeed.add(item.url);
     const hash=crypto.createHash("sha256").update(item.url).digest("hex");
     valid.push(CandidateSchema.parse({...item,key:hash,urlHash:hash,actorId:actor.id,actor_name:actor.name,feed_url:actor.feed_url,published_at:date.toISOString(),discovered_at:now.toISOString(),status:"pending"}));
    }
    valid.sort((a,b)=>b.published_at.localeCompare(a.published_at)||a.url.localeCompare(b.url));
    report.limited_items+=Math.max(0,valid.length-config.maxPerSource);candidates.push(...valid.slice(0,config.maxPerSource));
   }catch(error){source.status="error";source.error=error instanceof Error?error.message:String(error);report.errors++;}
   report.sources.push(source);
  }}
  await Promise.all(Array.from({length:config.concurrency},worker));
  // Stable global order makes duplicate attribution and the per-run cap reproducible.
  candidates.sort((a,b)=>b.published_at.localeCompare(a.published_at)||a.actorId-b.actorId||a.url.localeCompare(b.url));
  const fresh:Candidate[]=[];
  for(const item of candidates){if(known.has(item.url)){report.duplicates++;continue;}
if(fresh.length>=config.maxNewItems){report.limited_items++;continue;}known.add(item.url);fresh.push(item);}
  report.new_items=fresh.length;report.pending_items=state.entries.filter(e=>e.status==="pending").length+fresh.length;report.sources.sort((a:any,b:any)=>a.actorId-b.actorId);
  if(!options.dryRun){const tmp=file+".tmp";await fs.writeFile(tmp,JSON.stringify({version:1,entries:[...state.entries,...fresh],last_run:report},null,2)+"\n");await fs.rename(tmp,file);}
  return report;
 }finally{await lock.close();await fs.rm(lockPath,{force:true});}
}
