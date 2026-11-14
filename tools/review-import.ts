import {promises as fs} from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {z} from "zod";
import {CandidateSchema,canonicalUrl} from "./collection";
import {readCollecting,buildCollecting,reviewedInbox,optionalText} from "./collecting";
import {ArticleSchema,TopicSchema} from "../shared/schema";
const Keys=z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1);
const Base={id:z.string().min(1),approved:z.boolean().default(false),sources_verified:z.boolean().default(false),candidate_keys:Keys,publication_dates:z.record(z.string().datetime()).default({})};
export const DecisionsSchema=z.object({version:z.literal(1),reviewer:z.string(),decisions:z.array(z.discriminatedUnion("action",[
 z.object({...Base,action:z.literal("create_topic"),topic:z.object({title:z.string().trim().min(1),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),summary:z.string().nullable(),angleNote:z.string().nullable().default(null)})}),
 z.object({...Base,action:z.literal("link_topic"),topicId:z.number().int().positive(),topic_update:z.object({title:z.string().trim().min(1).optional(),summary:z.string().nullable().optional(),angleNote:z.string().nullable().optional()}).optional()}),
 z.object({...Base,action:z.literal("reject"),reason:z.string().default("")})
]))});
const stringify=(value:unknown)=>JSON.stringify(value,null,2)+"\n";
const stamp=(value:any)=>({...value,angleNote:value.angleNote??value.angle_note??null,startAt:value.startAt??value.start_at??null,endAt:value.endAt??value.end_at??null,updatedAt:value.updatedAt??value.updated_at});
export function planImport(input:{actors:any[];topics:any[];articles:any[];inbox:any;decisions:unknown;now?:Date}){
 const decisions=DecisionsSchema.parse(input.decisions),now=(input.now??new Date()).toISOString();
 const topics=structuredClone(input.topics),articles=structuredClone(input.articles),inbox=structuredClone(input.inbox);
 const candidates=CandidateSchema.array().parse(inbox.entries);
 const candidateByKey=new Map(candidates.map(c=>[c.key,c]));
 if(candidateByKey.size!==candidates.length)throw new Error("Duplicate inbox keys");
 const approved=decisions.decisions.filter(d=>d.approved);
 if(approved.length&&!decisions.reviewer.trim())throw new Error("A reviewer is required");
 const used=new Set<string>(),ids=new Set<string>();
 const summary={approved_decisions:approved.length,ignored_decisions:decisions.decisions.length-approved.length,new_topics:0,new_articles:0,linked_articles:0,rejected:0,already_applied:0};
 let topicId=Math.max(0,...topics.map(t=>t.id)),articleId=Math.max(0,...articles.map(a=>a.id));
 const actorIds=new Set(input.actors.map(a=>a.id));
 for(const d of approved){
  if(ids.has(d.id))throw new Error("Duplicate decision id");ids.add(d.id);
  const selected=d.candidate_keys.map(key=>{if(used.has(key))throw new Error("Candidate used by multiple approved decisions");used.add(key);const c=candidateByKey.get(key);if(!c)throw new Error(`Unknown candidate ${key}`);return c;});
  if(d.action==="reject"){
   if(!d.reason.trim())throw new Error("Rejection reason is required");
   for(const c of selected){if(c.status==="accepted")throw new Error("Cannot reject an already imported candidate");const original=inbox.entries.find((e:any)=>e.key===c.key);if(original.status==="rejected"){summary.already_applied++;continue;}Object.assign(original,{status:"rejected",reviewed_at:now,rejection_reason:d.reason});summary.rejected++;}continue;
  }
  if(!d.sources_verified)throw new Error("Explicit source verification is required before import");
  if(selected.some(c=>c.status==="rejected"))throw new Error("Rejected candidate must be reopened before import");
  let target:any;const beforeArticles=summary.new_articles+summary.linked_articles;let textChanged=false;
  if(d.action==="create_topic"){
   if(!d.topic.summary?.trim())throw new Error("A reviewed summary is required for a new topic");
   if(new Set(selected.map(c=>c.actorId)).size<2)throw new Error("A new comparative topic requires two distinct sources");
   target=topics.find(t=>t.slug===d.topic.slug);
   if(target&&target.review_import_id!==d.id)throw new Error("Topic slug already exists; use link_topic");
   if(target&&(target.title!==d.topic.title||target.summary!==d.topic.summary||target.angleNote!==d.topic.angleNote))throw new Error("An already imported decision was edited; update the topic separately");
   if(!target){target={...d.topic,id:++topicId,startAt:null,endAt:null,created_at:now,updatedAt:now,review_import_id:d.id};topics.push(target);summary.new_topics++;}
  }else{target=topics.find(t=>t.id===d.topicId);if(!target)throw new Error("Topic not found");
   if(d.topic_update){for(const field of ["title","summary","angleNote"] as const){const value=d.topic_update[field];if(value!==undefined&&target[field]!==value){target[field]=value;if(field==="angleNote"&&Object.hasOwn(target,"angle_note"))target.angle_note=value;textChanged=true;}}}
  }
  for(const c of selected){
   if(!actorIds.has(c.actorId))throw new Error("Candidate actor not found");
   const url=canonicalUrl(c.url),hash=crypto.createHash("sha256").update(url).digest("hex");
   if(hash!==c.key||hash!==c.urlHash)throw new Error("Candidate URL/key mismatch");
   const date=d.publication_dates[c.key]??(c.date_basis==="published"?c.published_at:undefined);
   if(!date)throw new Error("An updated-only date requires a confirmed publication_dates override");
   let existing=articles.find(a=>{try{return canonicalUrl(a.url)===url;}catch{return false;}});
   if(existing){
    if(existing.actorId!==c.actorId)throw new Error("Existing URL belongs to another actor");
    if(existing.topicId!=null&&existing.topicId!==target.id)throw new Error("Article already belongs to another topic; refusing to move it");
    if(existing.topicId==null){existing.topicId=target.id;summary.linked_articles++;}else summary.already_applied++;
   }else{
    existing={id:++articleId,topicId:target.id,actorId:c.actorId,url,urlHash:hash,title:c.title,excerpt:c.excerpt,published_at:date,created_at:now,review_import_id:d.id,discovery_origin:c.origin,...(c.source_platform?{source_platform:c.source_platform}:{}),...(c.source_profile?{source_profile:c.source_profile}:{}),...(c.content_kind?{content_kind:c.content_kind}:{}),...(c.evidence_checked_at?{evidence_checked_at:c.evidence_checked_at}:{})};articles.push(existing);summary.new_articles++;
   }
   Object.assign(inbox.entries.find((e:any)=>e.key===c.key),{status:"accepted",reviewed_at:now,article_id:existing.id,topic_id:target.id});
  }
  if(textChanged||summary.new_articles+summary.linked_articles>beforeArticles)target.updatedAt=now;
 }
 for(const t of topics)TopicSchema.parse(stamp(t));
 for(const a of articles){ArticleSchema.parse({...a,topicId:a.topicId??null,excerpt:a.excerpt??null});if(!actorIds.has(a.actorId))throw new Error("Article references an unknown actor");if(a.topicId!=null&&!topics.some(t=>t.id===a.topicId))throw new Error("Article references an unknown topic");}
 for(const rows of [topics,articles])if(new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error("Duplicate record ids");
 if(new Set(topics.map(t=>t.slug)).size!==topics.length)throw new Error("Duplicate topic slugs");
 return {topics,articles,inbox,summary};
}
async function exists(file:string){try{await fs.access(file);return true;}catch(e:any){if(e.code==="ENOENT")return false;throw e;}}
async function atomic(file:string,content:string|null){if(content===null){await fs.rm(file,{force:true});return;}const tmp=file+".review.tmp";await fs.writeFile(tmp,content);await fs.rename(tmp,file);}
const legacyFilenames=["topics.json","articles.json","inbox.json"] as const;
const filenames=[...legacyFilenames,"collecting.json"] as const;
function files(dataDir:string,collectionDir:string,names:readonly string[]=filenames){return names.map(name=>path.join(name==="topics.json"||name==="articles.json"?dataDir:collectionDir,name));}
async function locks(dataDir:string,collectionDir:string){
 const handles:{file:string;handle:Awaited<ReturnType<typeof fs.open>>}[]=[];
 try{for(const file of [path.join(dataDir,".review-import.lock"),path.join(collectionDir,"collection.lock")])handles.push({file,handle:await fs.open(file,"wx")});}
 catch(error){for(const l of handles){await l.handle.close();await fs.rm(l.file,{force:true});}throw new Error("Import/collection lock exists; check active processes before recovery");}
 return async()=>{for(const l of handles){await l.handle.close();await fs.rm(l.file,{force:true});}};
}
export async function applyReview(options:{dataDir:string;collectionDir:string;decisions?:unknown;fromCollecting?:boolean;dryRun?:boolean;afterWrite?:(index:number)=>Promise<void>}){
 const dataDir=path.resolve(options.dataDir),collectionDir=path.resolve(options.collectionDir);
 const marker=path.join(dataDir,".review-import.json");if(await exists(marker))throw new Error("Unfinished import: run review:recover before continuing");
 const release=await locks(dataDir,collectionDir);
 try{
  const paths=files(dataDir,collectionDir),work=await readCollecting(collectionDir);
  const before:(string|null)[]=[...await Promise.all(paths.slice(0,3).map(f=>fs.readFile(f,"utf8"))),work.text];
  const actorsFile=path.join(dataDir,"actors.json"),actorsText=await fs.readFile(actorsFile,"utf8");
  if(options.fromCollecting&&!work.document)throw new Error("collecting.json is missing; run collect:prepare");
  const decisions=DecisionsSchema.parse(options.fromCollecting?{version:1,reviewer:work.document!.reviewer,decisions:work.document!.decisions.filter((d:any)=>d?.approved===true)}:options.decisions);
  const approved=decisions.decisions.filter(d=>d.approved);
  const topics=JSON.parse(before[0]!),originalInbox=JSON.parse(before[2]!);
  const inbox=options.fromCollecting?reviewedInbox(originalInbox,topics,work.document!,approved):originalInbox;
  const plan=planImport({actors:JSON.parse(actorsText),topics,articles:JSON.parse(before[1]!),inbox,decisions});
  if(options.fromCollecting)plan.summary.ignored_decisions=work.document!.decisions.length-approved.length;
  const document=buildCollecting(plan.inbox,plan.topics,work.document,approved.map(d=>d.id));
  if(options.dryRun||!plan.summary.approved_decisions)return {...plan.summary,dry_run:!!options.dryRun,collecting_remaining:document.candidates.length};
  const id=crypto.randomUUID(),backup=path.join(collectionDir,"import-backups",id);await fs.mkdir(backup,{recursive:true});
  const after=[stringify(plan.topics),stringify(plan.articles),stringify(plan.inbox),stringify(document)];
  await fs.writeFile(path.join(backup,"files.json"),stringify(filenames.map((name,i)=>({name,existed:before[i]!==null}))));
  for(let i=0;i<filenames.length;i++){await fs.writeFile(path.join(backup,"before-"+filenames[i]),before[i]??"");await fs.writeFile(path.join(backup,"after-"+filenames[i]),after[i]);}
  await fs.writeFile(path.join(backup,"decisions.json"),stringify(decisions));
  if((await fs.readFile(actorsFile,"utf8"))!==actorsText)throw new Error("Actors changed during import");
  for(let i=0;i<paths.length;i++)if(await optionalText(paths[i])!==before[i])throw new Error("Source or collecting.json changed during import; no changes applied");
  await atomic(marker,stringify({version:1,id}));
  try{
   for(let i=0;i<paths.length;i++){await atomic(paths[i],after[i]);await options.afterWrite?.(i);}
   await fs.writeFile(path.join(backup,"result.json"),stringify({status:"committed",summary:plan.summary}));
   await fs.rm(marker);
  }catch(error){
   let conflict=false;
   for(let i=0;i<paths.length;i++){const current=await optionalText(paths[i]);if(current!==before[i]&&current!==after[i])conflict=true;}
   if(conflict)throw new Error("Import interrupted with external edits; backups preserved, manual recovery required");
   for(let i=0;i<paths.length;i++)await atomic(paths[i],before[i]);
   await fs.writeFile(path.join(backup,"result.json"),stringify({status:"rolled_back"}));await fs.rm(marker);throw error;
  }
  return {...plan.summary,dry_run:false,collecting_remaining:document.candidates.length,backup};
 }finally{await release();}
}
export async function recoverReview(dataDir:string,collectionDir:string){
 dataDir=path.resolve(dataDir);collectionDir=path.resolve(collectionDir);const marker=path.join(dataDir,".review-import.json");
 const transaction=JSON.parse(await fs.readFile(marker,"utf8"));if(!/^[0-9a-f-]{36}$/.test(transaction.id))throw new Error("Invalid recovery marker");
 const release=await locks(dataDir,collectionDir);
 try{
  const backup=path.join(collectionDir,"import-backups",transaction.id);
  const metadata=await optionalText(path.join(backup,"files.json"));
  const entries=metadata===null?legacyFilenames.map(name=>({name,existed:true})):z.array(z.object({name:z.enum(filenames),existed:z.boolean()})).parse(JSON.parse(metadata));
  const names=entries.map(e=>e.name);
  if(![legacyFilenames.join(","),filenames.join(",")].includes(names.join(","))||entries.slice(0,3).some(e=>!e.existed))throw new Error("Invalid recovery file manifest");
  const paths=files(dataDir,collectionDir,names);
  const before=await Promise.all(entries.map(async e=>e.existed?await fs.readFile(path.join(backup,"before-"+e.name),"utf8"):null));
  const after=await Promise.all(names.map(n=>fs.readFile(path.join(backup,"after-"+n),"utf8")));
  for(let i=0;i<paths.length;i++){const current=await optionalText(paths[i]);if(current!==before[i]&&current!==after[i])throw new Error("External edits detected; inspect backups manually");}
  for(let i=0;i<paths.length;i++)await atomic(paths[i],before[i]);
  await fs.writeFile(path.join(backup,"result.json"),stringify({status:"recovered_to_before"}));await fs.rm(marker);return {restored:true,backup};
 }finally{await release();}
}
