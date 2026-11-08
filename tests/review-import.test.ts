import {test} from "node:test";
import assert from "node:assert/strict";
import {promises as fs} from "node:fs";
import path from "node:path";
import {tmpdir} from "node:os";
import crypto from "node:crypto";
import {planImport,applyReview,recoverReview} from "../tools/review-import";
import {publishData} from "../tools/publication";
const date="2026-11-08T10:00:00.000Z";
const candidate=(actorId:number)=>{const url=`https://source${actorId}.example.org/article`;const hash=crypto.createHash("sha256").update(url).digest("hex");return {key:hash,urlHash:hash,actorId,actor_name:`Source ${actorId}`,feed_url:`https://source${actorId}.example.org/feed`,url,title:"Test article",excerpt:"Test excerpt",published_at:date,date_basis:"published",discovered_at:date,status:"pending"};};
const input=()=>({actors:[{id:1},{id:2}],topics:[],articles:[],inbox:{version:1,entries:[candidate(1),candidate(2)]}});
const decisions=(approved=true)=>({version:1,reviewer:"Reviewer",decisions:[{id:"decision-1",action:"create_topic",approved,sources_verified:true,candidate_keys:[candidate(1).key,candidate(2).key],topic:{title:"Test topic",slug:"test-topic",summary:"A deliberately synthetic summary for tests.",angleNote:null}}]});
test("unapproved drafts do not import; approval creates one topic, two articles and repeats without duplicates",()=>{
 const base=input();assert.equal(planImport({...base,decisions:decisions(false)}).summary.new_articles,0);
 const first=planImport({...base,decisions:decisions()});assert.equal(first.topics.length,1);assert.equal(first.articles.length,2);assert.equal(first.inbox.entries[0].status,"accepted");
 const second=planImport({...base,...first,decisions:decisions()});assert.equal(second.summary.new_articles,0);assert.equal(second.topics.length,1);assert.equal(second.articles.length,2);
});
test("source verification, reviewed summary, candidate uniqueness and confirmed publication dates are required",()=>{
 let d:any=decisions();d.decisions[0].sources_verified=false;assert.throws(()=>planImport({...input(),decisions:d}),/verification/);
 d=decisions();d.decisions[0].topic.summary="";assert.throws(()=>planImport({...input(),decisions:d}),/summary/);
 d=decisions();d.decisions.push({...d.decisions[0],id:"decision-2"});assert.throws(()=>planImport({...input(),decisions:d}),/multiple/);
 const b:any=input();b.inbox.entries[0].date_basis="updated";assert.throws(()=>planImport({...b,decisions:decisions()}),/updated-only/);
 d=decisions();d.decisions[0].publication_dates={[candidate(1).key]:date};assert.equal(planImport({...b,decisions:d}).articles.length,2);
});
test("linking preserves existing IDs; rejecting cannot remove an already accepted article",()=>{
 const first=planImport({...input(),decisions:decisions()});
 const d={version:1,reviewer:"Reviewer",decisions:[{id:"reject",action:"reject",approved:true,candidate_keys:[candidate(1).key],reason:"Not relevant"}]};
 assert.throws(()=>planImport({...input(),...first,decisions:d}),/already imported/);
 const rejection=planImport({...input(),decisions:d});assert.equal(rejection.inbox.entries[0].status,"rejected");assert.equal(rejection.articles.length,0);
 const base:any=input();base.topics=first.topics;base.articles=[{...first.articles[0],id:42,topicId:null}];
 const linked=planImport({...base,decisions:{version:1,reviewer:"Reviewer",decisions:[{id:"link",action:"link_topic",approved:true,sources_verified:true,candidate_keys:[candidate(1).key],topicId:1}]}});
 assert.equal(linked.articles[0].id,42);assert.equal(linked.articles[0].topicId,1);assert.equal(linked.summary.linked_articles,1);
});
async function fixture(){const root=await fs.mkdtemp(path.join(tmpdir(),"curios-review-"));const dataDir=path.join(root,"data"),collectionDir=path.join(root,"collection");await fs.mkdir(dataDir);await fs.mkdir(collectionDir);const b=input();for(const [name,value]of [["actors",b.actors],["topics",b.topics],["articles",b.articles]] as const)await fs.writeFile(path.join(dataDir,name+".json"),JSON.stringify(value));await fs.writeFile(path.join(collectionDir,"inbox.json"),JSON.stringify(b.inbox));return {root,dataDir,collectionDir};}
async function snapshot(f:Awaited<ReturnType<typeof fixture>>){return Promise.all([path.join(f.dataDir,"topics.json"),path.join(f.dataDir,"articles.json"),path.join(f.collectionDir,"inbox.json")].map(p=>fs.readFile(p,"utf8")));}
test("dry-run preserves source files, successful imports create backups, interrupted writes roll back",async()=>{
 const f=await fixture();try{
 const before=await snapshot(f);await applyReview({...f,decisions:decisions(),dryRun:true});assert.deepEqual(await snapshot(f),before);
 await assert.rejects(applyReview({...f,decisions:decisions(),afterWrite:async index=>{if(index===1)throw new Error("Simulated interruption");}}),/Simulated/);
 assert.deepEqual(await snapshot(f),before);await assert.rejects(fs.access(path.join(f.dataDir,".review-import.json")),{code:"ENOENT"});
 const result=await applyReview({...f,decisions:decisions()});assert.equal(result.new_articles,2);assert.ok("backup" in result);assert.equal(JSON.parse((await snapshot(f))[1]).length,2);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test("recovery restores an incomplete transaction and publication refuses unfinished imports",async()=>{
 const f=await fixture();try{
 const before=await snapshot(f),id=crypto.randomUUID(),dir=path.join(f.collectionDir,"import-backups",id);await fs.mkdir(dir,{recursive:true});
 for(const [i,name]of ["topics.json","articles.json","inbox.json"].entries()){await fs.writeFile(path.join(dir,"before-"+name),before[i]);await fs.writeFile(path.join(dir,"after-"+name),before[i]+"\n");}
 await fs.writeFile(path.join(f.dataDir,"topics.json"),before[0]+"\n");await fs.writeFile(path.join(f.dataDir,".review-import.json"),JSON.stringify({version:1,id}));
 await assert.rejects(publishData(f.dataDir,path.join(f.root,"public")),/unfinished/);
 await assert.rejects(applyReview({...f,decisions:decisions()}),/Unfinished/);
 assert.equal((await recoverReview(f.dataDir,f.collectionDir)).restored,true);assert.deepEqual(await snapshot(f),before);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
