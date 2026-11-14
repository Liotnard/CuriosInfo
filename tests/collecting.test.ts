import {test} from "node:test";
import assert from "node:assert/strict";
import {promises as fs} from "node:fs";
import path from "node:path";
import {tmpdir} from "node:os";
import crypto from "node:crypto";
import {prepareCollecting,readCollecting,collectingFile} from "../tools/collecting";
import {applyReview,recoverReview} from "../tools/review-import";
import {collectNews} from "../tools/collection";
const now=new Date("2026-11-14T12:00:00.000Z"),date="2026-11-14T10:00:00.000Z";
const stringify=(v:unknown)=>JSON.stringify(v,null,2)+"\n";
const candidate=(id:number)=>{const url="https://source"+id+".example.org/article",hash=crypto.createHash("sha256").update(url).digest("hex");return {key:hash,urlHash:hash,actorId:id,actor_name:"Source "+id,feed_url:"https://source"+id+".example.org/feed",url,title:"Original "+id,excerpt:"Source text",published_at:date,date_basis:"published",discovered_at:date,status:"pending"};};
async function fixture(){
 const root=await fs.mkdtemp(path.join(tmpdir(),"curios-collecting-")),dataDir=path.join(root,"data"),collectionDir=path.join(root,"collection");await fs.mkdir(dataDir);await fs.mkdir(collectionDir);
 const actors=[1,2,3].map(id=>({id,name:"Source "+id,feed_url:"https://source"+id+".example.org/feed",source_qualification:{status:"feed_verified"}}));
 const topics=[{id:1,title:"Existing topic",slug:"existing",summary:"Existing summary",angle_note:"Existing angle",created_at:date,updated_at:date,start_at:null,end_at:null}];
 for(const [n,v] of [["actors",actors],["topics",topics],["articles",[]]] as const)await fs.writeFile(path.join(dataDir,n+".json"),stringify(v));
 await fs.writeFile(path.join(collectionDir,"inbox.json"),stringify({version:1,entries:[1,2,3].map(candidate)}));
 await prepareCollecting(dataDir,collectionDir);return {root,dataDir,collectionDir};
}
async function read(file:string){return JSON.parse(await fs.readFile(file,"utf8"));}
async function edit(f:Awaited<ReturnType<typeof fixture>>,fn:(doc:any)=>void){const file=collectingFile(f.collectionDir),doc=await read(file);fn(doc);await fs.writeFile(file,stringify(doc));}
const paths=(f:Awaited<ReturnType<typeof fixture>>)=>[path.join(f.dataDir,"topics.json"),path.join(f.dataDir,"articles.json"),path.join(f.collectionDir,"inbox.json"),collectingFile(f.collectionDir)];
const snapshot=(f:Awaited<ReturnType<typeof fixture>>)=>Promise.all(paths(f).map(p=>fs.readFile(p,"utf8")));
const link=(keys=[candidate(1).key])=>({id:"link-existing",action:"link_topic",approved:true,sources_verified:true,candidate_keys:keys,topicId:1});
const collectOptions=(f:Awaited<ReturnType<typeof fixture>>)=>({...f,now,config:{actorIds:[3],maxAgeDays:3,maxPerSource:20,maxNewItems:100,concurrency:1}});
const feed=(url:string)=>'<rss><channel><item><title>News</title><link>'+url+'</link><pubDate>'+date+'</pubDate></item></channel></rss>';

test("one file contains pending publications and topic context; re-preparing preserves operator edits",async()=>{
 const f=await fixture();try{
 await edit(f,w=>{w.notes="Operator draft";w.reviewer="Reviewer";w.candidates[0].title="Reviewed title";w.candidates[0].notes="Evidence to check";w.decisions=[{...link(),approved:false}];});
 await prepareCollecting(f.dataDir,f.collectionDir);const w=(await readCollecting(f.collectionDir)).document!;
 assert.equal(w.candidates.length,3);assert.equal(w.topics[0].angleNote,"Existing angle");assert.equal(w.notes,"Operator draft");assert.equal(w.candidates[0].title,"Reviewed title");assert.equal(w.candidates[0].notes,"Evidence to check");assert.equal((w.decisions[0] as any).approved,false);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test("approved import clears only processed items, retains drafts and source history, and empties safely after rejection",async()=>{
 const f=await fixture();try{
 await edit(f,w=>{w.reviewer="Reviewer";w.notes="Draft notes";w.candidates.find((c:any)=>c.actorId===1).title="Reviewed title";w.decisions=[{id:"create",action:"create_topic",approved:true,sources_verified:true,candidate_keys:[candidate(1).key,candidate(2).key],topic:{title:"New topic",slug:"new-topic",summary:"Reviewed facts",angleNote:"Reviewed angle"}},{id:"later",action:"reject",approved:false,candidate_keys:[candidate(3).key],reason:"Not relevant"}];});
 const before=await snapshot(f);const preview=await applyReview({...f,fromCollecting:true,dryRun:true});assert.equal(preview.new_articles,2);assert.deepEqual(await snapshot(f),before);
 const result=await applyReview({...f,fromCollecting:true});assert.equal(result.collecting_remaining,1);
 let w=(await readCollecting(f.collectionDir)).document!;assert.equal(w.candidates[0].actorId,3);assert.equal(w.decisions.length,1);assert.equal(w.notes,"Draft notes");
 assert.equal((await read(path.join(f.dataDir,"articles.json"))).find((a:any)=>a.actorId===1).title,"Reviewed title");
 const ledger=await read(path.join(f.collectionDir,"inbox.json"));assert.equal(ledger.entries.filter((c:any)=>c.status==="accepted").length,2);
 await edit(f,w=>{w.decisions[0].approved=true;});await applyReview({...f,fromCollecting:true});w=(await readCollecting(f.collectionDir)).document!;
 assert.deepEqual(w.candidates,[]);assert.deepEqual(w.decisions,[]);assert.deepEqual(w.source_fingerprints,{});assert.equal(w.reviewer,"");assert.equal(w.notes,"");
 const report=await collectNews({...collectOptions(f),download:async url=>({url,xml:feed(candidate(3).url)})});assert.equal(report.new_items,0);assert.equal(report.duplicates,1);assert.equal((await readCollecting(f.collectionDir)).document!.candidates.length,0);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test("unapproved collecting decisions do not import or clear anything",async()=>{
 const f=await fixture();try{await edit(f,w=>{w.decisions=[{...link(),approved:false}];});const before=await snapshot(f);const report=await applyReview({...f,fromCollecting:true});assert.equal(report.approved_decisions,0);assert.deepEqual(await snapshot(f),before);}finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test("editing a candidate identity or changing the underlying source blocks import without losing work",async()=>{
 const f=await fixture();try{
 await edit(f,w=>{w.reviewer="Reviewer";w.decisions=[link()];w.candidates.find((c:any)=>c.actorId===1).actorId=2;});
 let before=await snapshot(f);await assert.rejects(applyReview({...f,fromCollecting:true}),/Only candidate title/);assert.deepEqual(await snapshot(f),before);
 await edit(f,w=>{w.candidates.find((c:any)=>c.key===candidate(1).key).actorId=1;});
 const ledger=await read(path.join(f.collectionDir,"inbox.json"));ledger.entries[0].excerpt="New source revision";await fs.writeFile(path.join(f.collectionDir,"inbox.json"),stringify(ledger));before=await snapshot(f);
 await assert.rejects(applyReview({...f,fromCollecting:true}),/source changed/);assert.deepEqual(await snapshot(f),before);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test("topic text can be revised while linking; stale context cannot overwrite newer text",async()=>{
 const f=await fixture();try{
 await edit(f,w=>{w.reviewer="Reviewer";w.decisions=[{...link(),topic_update:{summary:"New reviewed summary",angleNote:null}}];});
 await applyReview({...f,fromCollecting:true});let topics=await read(path.join(f.dataDir,"topics.json"));assert.equal(topics[0].summary,"New reviewed summary");assert.equal(topics[0].angleNote,null);assert.equal(topics[0].angle_note,null);
 await edit(f,w=>{w.reviewer="Reviewer";w.decisions=[{...link([candidate(2).key]),topic_update:{summary:"Old proposal"}}];});
 topics[0].summary="Another operator's newer text";await fs.writeFile(path.join(f.dataDir,"topics.json"),stringify(topics));const before=await snapshot(f);
 await assert.rejects(applyReview({...f,fromCollecting:true}),/Topic text changed/);assert.deepEqual(await snapshot(f),before);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test("RSS collection adds new items to the same work file and preserves drafts and rejects manual clearing",async()=>{
 const f=await fixture();try{
 await edit(f,w=>{w.notes="Work in progress";w.decisions=[{...link(),approved:false}];w.candidates=[];});
 await prepareCollecting(f.dataDir,f.collectionDir);assert.equal((await readCollecting(f.collectionDir)).document!.candidates.length,3);
 await collectNews({...collectOptions(f),download:async url=>({url,xml:feed("https://source3.example.org/new")})});const w=(await readCollecting(f.collectionDir)).document!;
 assert.equal(w.candidates.length,4);assert.equal(w.notes,"Work in progress");assert.equal(w.decisions.length,1);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test("edits made during collection survive; newly gathered metadata remains recoverable from history",async()=>{
 const f=await fixture();try{
 await assert.rejects(collectNews({...collectOptions(f),download:async url=>{await edit(f,w=>{w.notes="Changed while fetching";});return {url,xml:feed("https://source3.example.org/new")};}}),/collecting.json changed/);
 assert.equal((await readCollecting(f.collectionDir)).document!.notes,"Changed while fetching");assert.equal((await read(path.join(f.collectionDir,"inbox.json"))).entries.length,4);
 await prepareCollecting(f.dataDir,f.collectionDir);const w=(await readCollecting(f.collectionDir)).document!;assert.equal(w.notes,"Changed while fetching");assert.equal(w.candidates.length,4);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test("an interruption after the fourth write restores the database and the operator file",async()=>{
 const f=await fixture();try{
 await edit(f,w=>{w.reviewer="Reviewer";w.notes="Keep my work";w.decisions=[link()];});const before=await snapshot(f);
 await assert.rejects(applyReview({...f,fromCollecting:true,afterWrite:async index=>{if(index===3)throw new Error("Stop after collecting write");}}),/Stop after/);assert.deepEqual(await snapshot(f),before);
 await assert.rejects(fs.access(path.join(f.dataDir,".review-import.json")),{code:"ENOENT"});
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test("recovery includes collecting.json and refuses to erase subsequent operator edits",async()=>{
 const f=await fixture();try{
 await edit(f,w=>{w.reviewer="Reviewer";w.decisions=[link()];});const before=await snapshot(f);const result=await applyReview({...f,fromCollecting:true});assert.ok("backup" in result);
 const id=path.basename(result.backup!);await fs.writeFile(path.join(f.dataDir,".review-import.json"),stringify({version:1,id}));
 await edit(f,w=>{w.notes="New manual edit";});await assert.rejects(recoverReview(f.dataDir,f.collectionDir),/External edits/);
 const after=await fs.readFile(path.join(result.backup!,"after-collecting.json"),"utf8");await fs.writeFile(collectingFile(f.collectionDir),after);
 await recoverReview(f.dataDir,f.collectionDir);assert.deepEqual(await snapshot(f),before);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});

test("duplicate decision IDs cannot silently remove an unapproved draft during cleanup",async()=>{
 const f=await fixture();try{
 await edit(f,w=>{w.reviewer="Reviewer";w.decisions=[link(),{...link([candidate(2).key]),approved:false}];});const before=await snapshot(f);
 await assert.rejects(applyReview({...f,fromCollecting:true}),/Decision IDs must be unique/);assert.deepEqual(await snapshot(f),before);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});

test("unfinished unapproved drafts remain editable while another decision is imported",async()=>{
 const f=await fixture();try{
 await edit(f,w=>{w.reviewer="Reviewer";w.decisions=[link(),{id:"unfinished",action:"create_topic",approved:false,notes:"Still writing the summary"}];});
 const result=await applyReview({...f,fromCollecting:true});assert.equal(result.new_articles,1);assert.equal(result.ignored_decisions,1);
 const w=(await readCollecting(f.collectionDir)).document!;assert.equal(w.decisions.length,1);assert.equal((w.decisions[0] as any).notes,"Still writing the summary");assert.equal(w.candidates.length,2);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
