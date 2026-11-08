import {promises as fs} from "node:fs";
import path from "node:path";
import {placeholder,platform,probe,type Check} from "./source-check";
const dataDir=path.resolve(process.env.JSON_DB_DIR || "data");
const reportDir=path.resolve(process.env.QUALIFICATION_REPORT_DIR || "reports");
const apply=process.argv.includes("--apply");
const actors=JSON.parse(await fs.readFile(path.join(dataDir,"actors.json"),"utf8"));
const initial=JSON.stringify(actors);
const maps=JSON.parse(await fs.readFile(path.join(dataDir,"mapactors.json"),"utf8"));
const hints=JSON.parse(await fs.readFile(path.resolve("data/feed-candidates.json"),"utf8"));
const checked_at=new Date().toISOString();
const cache=new Map<string,ReturnType<typeof probe>>();
const check=(url:string)=>{if(!cache.has(url))cache.set(url,probe(url));return cache.get(url)!;};
const sameHost=(a:string,b:string)=>new URL(a).hostname.replace(/^www\./,"")===new URL(b).hostname.replace(/^www\./,"");
const reports:any[]=[];let cursor=0,completed=0;
async function worker(){
 while(cursor<actors.length){
  const actor=actors[cursor++];const original=actor.feed_url || "";
  const mapped=maps.find((m:any)=>m.id===actor.id)?.urls ?? [];
  const additional=new Set<string>(actor.additional_urls ?? []);
  const report:any={actor_id:actor.id,name:actor.name,original_url:actor.source_qualification?.original_url ?? original,input_url:original,checked_at,checks:[],status:"manual_review",method:"network",reference_url:mapped[0] ?? original};
  let selected:string|undefined;let website:string|undefined;
  // Social profile URLs are identified structurally. No attempt to bypass login or anti-bot controls.
  if(platform(original)) {report.status="platform_requires_connector";report.method="classification_only";report.note="Profile URL, not a generic RSS endpoint. Identity and account availability not checked.";}
  else {
   const primary=placeholder(original)?mapped[0]:original;
   if (!primary || platform(primary)) {report.status=primary?"platform_requires_connector":"placeholder";report.method="classification_only";report.note="No directly testable website/feed in the primary references.";}
   else {
    const first=await check(primary);report.checks.push(first.check);
    if(first.check.kind==="html" && sameHost(primary,first.check.final_url!))website=first.check.final_url;
    if(["rss","atom"].includes(first.check.kind) && sameHost(primary,first.check.final_url!)) selected=primary;
    const base=new URL(primary).origin;
    const candidates=[...(hints[String(actor.id)] ?? []),...first.discovered,base+"/feed/",base+"/rss.xml",base+"/spip.php?page=backend"];
    // A shared institutional/author platform feed cannot be attributed to an individual automatically.
    const personal=actor.actor_type.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const ambiguous=(personal==="influenceur" || personal==="personnalite") && /iris-france|mediapart|assemblee-nationale|europarl|info\.gouv/.test(base);
    if(ambiguous) {selected=undefined;report.status="scope_review_required";report.note="Shared institutional/author site: a global feed would include other authors.";}
    else {
     for(const url of [...new Set(candidates)].slice(0,6)){
      if(selected)break;
      if(!sameHost(url,primary))continue;
      await new Promise(resolve=>setTimeout(resolve,300));
      const result=await check(url);report.checks.push(result.check);
      if(["rss","atom"].includes(result.check.kind) && sameHost(url,result.check.final_url!))selected=url;
     }
     report.status=selected?"feed_verified":report.checks.some((r:Check)=>r.kind==="html")?"website_only":report.checks.some((r:Check)=>r.kind==="access_restricted")?"access_restricted":"unreachable";
    }
   }
  }
  if(selected){if(original && original!==selected)additional.add(original);actor.feed_url=selected;report.selected_url=selected;const evidence=report.checks.find((r:Check)=>r.url===selected);report.format=evidence?.kind;report.entries=evidence?.entries;if(evidence?.entries===0)report.status="feed_empty";}
  if(website){actor.website_url=website;if(website!==actor.feed_url)additional.add(website);}
  if(additional.size)actor.additional_urls=[...additional];
  // Preserve the very first reference through all subsequent runs.
  const source_url=actor.source_qualification?.original_url ?? original;
  actor.source_qualification={status:report.status,checked_at,original_url:source_url,method:report.method,reference_url:report.reference_url,...(report.format?{format:report.format,entries:report.entries}:{}),...(report.note?{note:report.note}:{})};
  reports.push(report);completed++;if(completed%20===0)console.log(`Qualified ${completed}/${actors.length}`);
 }
}
await Promise.all(Array.from({length:6},worker));
reports.sort((a,b)=>a.actor_id-b.actor_id);
const summary=reports.reduce((out:any,r:any)=>{out[r.status]=(out[r.status]||0)+1;return out;},{});
await fs.mkdir(reportDir,{recursive:true});
await fs.writeFile(path.join(reportDir,"source-qualification.json"),JSON.stringify({checked_at,applied:apply,summary,actors:reports},null,2)+"\n");
if(apply){
 const current=JSON.parse(await fs.readFile(path.join(dataDir,"actors.json"),"utf8"));
 if(JSON.stringify(current)!==initial)throw new Error("actors.json changed during audit; refusing to overwrite it");
 const file=path.join(dataDir,"actors.json");const tmp=file+".qualification.tmp";
 await fs.writeFile(tmp,JSON.stringify(actors,null,2)+"\n");await fs.rename(tmp,file);
}
console.log(JSON.stringify({applied:apply,actors:actors.length,requests:cache.size,summary}));
