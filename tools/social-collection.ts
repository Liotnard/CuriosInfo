import {promises as fs} from "node:fs";
import path from "node:path";
import {randomUUID,createHash} from "node:crypto";
import {CandidateSchema,parseFeed,downloadFeed,type Candidate} from "./collection";
import {discoverFeeds} from "./source-check";
import {buildSocialSources,candidateFromPage,matchesTerms,ownPostLinks,PageSchema,profile,type SocialSource,type FetchPages,type Page} from "./social-sources";

export async function youtubeFeed(source:SocialSource,request:typeof fetch=fetch):Promise<string>{
 let id=source.channelId;
 if(!id){
  const response=await request(source.url,{signal:AbortSignal.timeout(12000)});
  if(!response.ok){await response.body?.cancel();throw new Error("YouTube channel HTTP "+response.status);}
  const reader=response.body!.getReader();const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>6000000){await reader.cancel();throw new Error("YouTube profile exceeds 2 MB");}chunks.push(value);const partial=Buffer.concat(chunks).toString("utf8");if(discoverFeeds(partial,source.url).some(f=>/youtube\.com\/(?:xml\/)?feeds\/videos\.xml/.test(f))){await reader.cancel();break;}}
  const html=Buffer.concat(chunks).toString("utf8");
  const feed=discoverFeeds(html,source.url).find(f=>{try{const u=new URL(f);return /(^|\.)youtube\.com$/.test(u.hostname)&&/^\/((xml\/)?feeds\/videos\.xml)$/.test(u.pathname)&&/^UC[\w-]{22}$/.test(u.searchParams.get("channel_id")??"");}catch{return false;}});
  if(feed)id=new URL(feed).searchParams.get("channel_id")!;
  if(!id)throw new Error("No owner-specific YouTube feed declared by channel page");
 }
 return "https://www.youtube.com/feeds/videos.xml?channel_id="+id;
}
export type SocialOptions={dataDir:string;collectionDir:string;actorIds?:number[];platforms?:string[];terms?:string[];maxAgeDays?:number;maxPages?:number;maxDailyPages?:number;maxPostsPerSource?:number;dryRun?:boolean;now?:Date;fetchPages?:FetchPages;pages?:Page[];observedAt?:Date;download?:typeof downloadFeed;request?:typeof fetch};
export async function collectSocial(options:SocialOptions){
 const now=options.now??new Date(),cutoff=new Date(now.getTime()-(options.maxAgeDays??3)*86400000),terms=options.terms??[];
 const read=async(p:string)=>JSON.parse(await fs.readFile(p,"utf8"));
 const actors=await read(path.join(options.dataDir,"actors.json")),maps=await read(path.join(options.dataDir,"mapactors.json"));
 if(options.actorIds?.some(id=>!actors.some((a:any)=>a.id===id)))throw new Error("Unknown actor ID");
 const sources=buildSocialSources(actors,maps).filter(s=>(!options.actorIds||options.actorIds.includes(s.actorId))&&(!options.platforms||options.platforms.includes(s.platform)));
 if(!sources.length)throw new Error("No social source matches selection");
 for(const name of [".review-import.json",".review-import.lock"]){try{await fs.access(path.join(options.dataDir,name));throw new Error("Finish the review import before collection");}catch(e:any){if(e.code!=="ENOENT")throw e;}}
 await fs.mkdir(options.collectionDir,{recursive:true});const lockPath=path.join(options.collectionDir,"collection.lock");
 const lock=await fs.open(lockPath,"wx").catch(()=>{throw new Error("Collection is already locked");});
 try{
  const inboxPath=path.join(options.collectionDir,"inbox.json");let state:any={version:1,entries:[]};
  try{state=await read(inboxPath);}catch(e:any){if(e.code!=="ENOENT")throw e;}
  state.entries=CandidateSchema.array().parse(state.entries);
  const articles=await read(path.join(options.dataDir,"articles.json"));
  const known=new Set([...articles,...state.entries].map((x:any)=>x.url));
  const report:any={id:randomUUID(),started_at:now.toISOString(),query_terms:terms,cutoff:cutoff.toISOString(),dry_run:!!options.dryRun,sources:[],pages_requested:0,new_items:0,duplicates:0,old_items:0,unmatched:0,unverified:0,errors:0,unavailable:0,exhaustive:false};
  const pending:Candidate[]=[];const cache=new Map<string,Page>();
  for(const p of options.pages??[]){const v=PageSchema.parse(p);cache.set(v.url,v);if(v.final_url)cache.set(v.final_url,v);}
  const fetchPage=async(url:string)=>{
   if(cache.has(url))return cache.get(url)!;
   if(!options.fetchPages)throw new Error("No browser access: supply captured evidence or configure a provider");
   if(report.pages_requested>=(options.maxPages??100))throw new Error("Browser page budget reached");
   const budgetPath=path.join(options.collectionDir,"social-browser-budget.json"),day=now.toISOString().slice(0,10);let budget={day,attempted_urls:0};
   try{const previous=await read(budgetPath);if(previous.day===day)budget=previous;}catch(e:any){if(e.code!=="ENOENT")throw e;}
   if(!Number.isInteger(budget.attempted_urls)||budget.attempted_urls<0)throw new Error("Invalid browser budget state");
   if(budget.attempted_urls>=(options.maxDailyPages??800))throw new Error("Daily browser page budget reached");
   budget.attempted_urls++;await fs.writeFile(budgetPath,JSON.stringify(budget)+"\n");
   report.pages_requested++;
   const response=await options.fetchPages([url]);
   for(const p of response.results){const valid=PageSchema.parse(p);cache.set(valid.url,valid);if(valid.final_url)cache.set(valid.final_url,valid);}
   if(!cache.has(url))throw new Error(response.errors.find(e=>e.url===url)?.error??"Page not returned by provider");
   return cache.get(url)!;
  };
  const retain=(c:Candidate,r:any)=>{
   if(new Date(c.published_at)<cutoff){report.old_items++;return;}
   r.verified_posts++;r.oldest_verified_at=!r.oldest_verified_at||r.oldest_verified_at>c.published_at?c.published_at:r.oldest_verified_at;
   if(!matchesTerms(c.title+" "+(c.excerpt??""),terms)){report.unmatched++;return;}
   r.matching_posts++;
   if(known.has(c.url)){report.duplicates++;return;}
   known.add(c.url);pending.push(c);report.new_items++;
  };
  for(const source of sources){
   const r:any={actorId:source.actorId,actor_name:source.actor_name,platform:source.platform,profile_url:source.url,checked_at:(options.observedAt??now).toISOString(),status:"unavailable",verified_posts:0,matching_posts:0,discovered_posts:0,errors:[],exhaustive:false};
   report.sources.push(r);
   if(source.ambiguous||source.scope_review){r.errors.push("Account belongs to several actor records; ownership must be resolved");report.unavailable++;continue;}
   try{
    if(source.platform==="youtube"){
     const feed=await youtubeFeed(source,options.request);let response;try{response=await (options.download??downloadFeed)(feed);}catch(e){if(/HTTP (404|500|502|503)/.test(String(e))&&!options.download)response=await downloadFeed(feed);else throw e;}const id=new URL(feed).searchParams.get("channel_id");const owner=/<yt:channelId>([^<]+)<\/yt:channelId>/.exec(response.xml)?.[1];if(!id||!(owner===id||owner===id.slice(2))||!response.xml.split("<entry>")[0].includes("https://www.youtube.com/channel/"+id))throw new Error("YouTube feed owner mismatch");const items=parseFeed(response.xml,response.url);
     r.discovered_posts=items.length;
     for(const item of items){
      if(!item.url||!item.title||!Number.isFinite(Date.parse(item.published_at)))continue;
      const date=new Date(item.published_at);if(date>now)continue;
      const key=createHash("sha256").update(item.url).digest("hex");
      const c=CandidateSchema.parse({...item,actorId:source.actorId,actor_name:source.actor_name,key,urlHash:key,feed_url:feed,origin:"youtube_feed",source_platform:"youtube",source_profile:source.url,content_kind:"video",published_at:date.toISOString(),evidence_checked_at:now.toISOString(),discovered_at:now.toISOString(),status:"pending"});retain(c,r);
     }
     r.status=items.length?"feed_read":"empty_feed";
    }else{
     // Saved original pages are a valid input from the connected browser; no invented profile visit is recorded.
     const saved=[...new Set(cache.values())].filter(p=>ownPostLinks(source,{...p,links:[p.final_url??p.url]}).length);
     let links=saved.map(p=>p.url);
     if(cache.has(source.url)||options.fetchPages){const page=await fetchPage(source.url);links=[...new Set([...links,...ownPostLinks(source,page)])];r.profile_read=true;}
     if(!links.length)throw new Error("No original post links available; cannot conclude absence of coverage");
     r.discovered_posts=links.length;
     const limit=options.maxPostsPerSource??20;
     for(const url of links.slice(0,limit)){
      if(known.has(url)){report.duplicates++;r.known_posts=(r.known_posts??0)+1;continue;}
      try{const p=await fetchPage(url);const c=candidateFromPage(source,p,now);c.evidence_checked_at=(options.observedAt??now).toISOString();retain(c,r);}catch(e){r.errors.push({url,error:e instanceof Error?e.message:String(e)});report.unverified++;}
     }
     r.limited_posts=Math.max(0,links.length-limit);
     r.status=r.verified_posts?"public_posts_read":r.known_posts?"known_posts_only":"no_verified_recent_post";
    }
   }catch(e){r.errors.push(e instanceof Error?e.message:String(e));r.status="unavailable";report.unavailable++;}
   report.errors+=r.errors.length;
  }
  report.pending_items=state.entries.filter((x:any)=>x.status==="pending").length+pending.length;
  report.incomplete=report.unavailable>0||report.unverified>0||report.sources.some((r:any)=>r.limited_posts>0||r.status==="no_verified_recent_post");
  if(!options.dryRun){
   const next={...state,entries:[...state.entries,...pending]};const tmp=inboxPath+".tmp";
   await fs.writeFile(tmp,JSON.stringify(next,null,2)+"\n");await fs.rename(tmp,inboxPath);
   const reports=path.join(options.collectionDir,"social-runs");await fs.mkdir(reports,{recursive:true});
   await fs.writeFile(path.join(reports,report.id+".json"),JSON.stringify(report,null,2)+"\n");
   await fs.writeFile(path.join(options.collectionDir,"social-last-run.json"),JSON.stringify(report,null,2)+"\n");
  }
  return report;
 }finally{await lock.close();await fs.rm(lockPath,{force:true});}
}
