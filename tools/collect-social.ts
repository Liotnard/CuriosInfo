import {promises as fs} from "node:fs";
import path from "node:path";
import {parseArgs} from "node:util";
import {buildSocialSources,PageSchema,tinyfishFetcher} from "./social-sources";
import {localBrowserFetcher} from "./local-social-browser";
import {collectSocial} from "./social-collection";
const {values}=parseArgs({options:{actors:{type:"string"},platforms:{type:"string"},terms:{type:"string"},evidence:{type:"string"},inventory:{type:"boolean"},"live-browser":{type:"boolean"},"local-browser":{type:"boolean"},"max-pages":{type:"string",default:"800"},"max-age-days":{type:"string",default:"3"},"dry-run":{type:"boolean"},"allow-partial":{type:"boolean"}}});
async function main(){
 const dataDir=path.resolve(process.env.JSON_DB_DIR||"data"),collectionDir=path.resolve(process.env.COLLECTION_DIR||"collection");
 if([dataDir,path.resolve("web"),path.resolve("dist")].some(root=>collectionDir===root||collectionDir.startsWith(root+path.sep)))throw new Error("Collection must remain private and outside sources/public files");
 const actors=JSON.parse(await fs.readFile(path.join(dataDir,"actors.json"),"utf8")),maps=JSON.parse(await fs.readFile(path.join(dataDir,"mapactors.json"),"utf8"));
 const actorIds=values.actors?.split(",").map(Number);if(actorIds?.some(id=>!Number.isInteger(id)||id<1||!actors.some((a:any)=>a.id===id)))throw new Error("Invalid or unknown actor ID");
 const platforms=values.platforms?.split(",");const available=["x","instagram","facebook","tiktok","threads","youtube","twitch","telegram","bluesky"];
 if(platforms?.some(p=>!available.includes(p)))throw new Error("Unknown social platform");
 const maxPages=Number(values["max-pages"]),maxAgeDays=Number(values["max-age-days"]);
 if(!Number.isInteger(maxPages)||maxPages<1||maxPages>2000||!Number.isFinite(maxAgeDays)||maxAgeDays<=0||maxAgeDays>365)throw new Error("Invalid collection limits");
 const sources=buildSocialSources(actors,maps).filter(s=>(!actorIds||actorIds.includes(s.actorId))&&(!platforms||platforms.includes(s.platform)));
 if(values.inventory){
  const inventory={created_at:new Date().toISOString(),sources,actor_count:new Set(sources.map(s=>s.actorId)).size,by_platform:Object.fromEntries(available.map(p=>[p,sources.filter(s=>s.platform===p).length])),ambiguous_sources:sources.filter(s=>s.ambiguous).length,scope_review_sources:sources.filter(s=>s.scope_review).length};
  if(!values["dry-run"]){await fs.mkdir(collectionDir,{recursive:true});await fs.writeFile(path.join(collectionDir,"social-inventory.json"),JSON.stringify(inventory,null,2)+"\n");}
  console.log(JSON.stringify({...inventory,sources:undefined},null,2));return;
 }
 let pages,observedAt;
 if(values.evidence){
  const snapshot=JSON.parse(await fs.readFile(path.resolve(values.evidence),"utf8"));
  observedAt=new Date(snapshot.fetched_at);if(!Number.isFinite(observedAt.getTime())||observedAt>new Date())throw new Error("Evidence needs a valid fetched_at timestamp");
  pages=PageSchema.array().parse(snapshot.results);
 }
 if(values["live-browser"]&&values["local-browser"])throw new Error("Choose one browser provider");
 const local=values["local-browser"]?await localBrowserFetcher(process.env.SOCIAL_STORAGE_STATE):undefined;
 const remote=values["live-browser"]||(!values.evidence&&!local&&Boolean(process.env.TINYFISH_API_KEY));
 const fetchPages=local?.fetchPages??(remote?tinyfishFetcher(process.env.TINYFISH_API_KEY||""):undefined);
 try {
 const report=await collectSocial({dataDir,collectionDir,actorIds,platforms,terms:values.terms?.split("|").map(s=>s.trim()).filter(Boolean),pages,observedAt,fetchPages,maxPages,maxAgeDays,dryRun:values["dry-run"]});
 console.log(JSON.stringify({...report,sources:report.sources.map((s:any)=>({actorId:s.actorId,platform:s.platform,status:s.status,verified_posts:s.verified_posts,matching_posts:s.matching_posts,errors:s.errors}))},null,2));
 if(report.incomplete&&!values["allow-partial"])process.exitCode=2;
 } finally {await local?.close();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exitCode=1;});
