import {test} from "node:test";
import assert from "node:assert/strict";
import {promises as fs} from "node:fs";
import path from "node:path";
import {tmpdir} from "node:os";
import {collectSocial} from "../tools/social-collection";
import {dailyCollection} from "../tools/daily-collection";
const now=new Date("2026-11-15T20:00:00Z");
async function fixture(){const dir=await fs.mkdtemp(path.join(tmpdir(),"curios-checkpoint-")),dataDir=path.join(dir,"data"),collectionDir=path.join(dir,"collection");await fs.mkdir(dataDir);await fs.writeFile(path.join(dataDir,"actors.json"),JSON.stringify([{id:1,name:"Person A",feed_url:"https://x.com/PersonA"},{id:2,name:"Person B",feed_url:"https://x.com/PersonB"}]));await fs.writeFile(path.join(dataDir,"mapactors.json"),"[]");await fs.writeFile(path.join(dataDir,"articles.json"),"[]");return {dir,dataDir,collectionDir};}
const page=(url:string,author="https://x.com/PersonA")=>({url,author,published_date:"2026-11-15T12:00:00Z",description:"Déclaration originale sur un sujet d’actualité",links:[],text:null});
test("social candidates and progress are durable before the next source is read",async()=>{
 const f=await fixture();try{
  let observed=false;
  const report=await collectSocial({...f,now,fetchPages:async urls=>{
   const url=urls[0];
   if(url==="https://x.com/PersonA")return {results:[{url,links:[url+"/status/123"]}],errors:[]};
   if(url.endsWith("/status/123"))return {results:[page(url)],errors:[]};
   const inbox=JSON.parse(await fs.readFile(path.join(f.collectionDir,"inbox.json"),"utf8"));
   const work=JSON.parse(await fs.readFile(path.join(f.collectionDir,"collecting.json"),"utf8"));
   const progress=JSON.parse(await fs.readFile(path.join(f.collectionDir,"social-last-run.json"),"utf8"));
   assert.equal(inbox.entries.length,1);assert.equal(work.candidates.length,1);assert.equal(progress.status,"running");assert.equal(progress.completed_sources,1);observed=true;
   return {results:[],errors:[{url,error:"login_required"}]};
  }});
  assert.equal(observed,true);assert.equal(report.status,"completed");assert.equal(report.new_items,1);assert.equal(report.persisted_items,1);
 }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});
test("owned post targeting skips profile fetching and checkpoints every five new posts",async()=>{
 const f=await fixture();try{
  const urls=Array.from({length:6},(_,i)=>"https://x.com/PersonA/status/"+(100+i));let calls=0;
  const report=await collectSocial({...f,now,postUrls:urls,fetchPages:async selected=>{
   assert.ok(urls.includes(selected[0]));calls++;
   if(calls===6){const inbox=JSON.parse(await fs.readFile(path.join(f.collectionDir,"inbox.json"),"utf8"));assert.equal(inbox.entries.length,5);}
   return {results:[page(selected[0])],errors:[]};
  }});
  assert.equal(report.new_items,6);assert.equal(report.sources.length,1);assert.equal(report.sources[0].profile_read,false);assert.equal(report.sources[0].supplied_posts,true);assert.equal(calls,6);
  await assert.rejects(collectSocial({...f,now,postUrls:["https://x.com/Unknown/status/123"]}),/documented account/);
 }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});
test("checkpoint failure preserves a concurrent operator edit and keeps new candidates in the ledger",async()=>{
 const f=await fixture();try{
  await fs.mkdir(f.collectionDir);
  const initial={version:1,updated_at:now.toISOString(),instructions:[],topics:[],candidates:[],source_fingerprints:{},decisions:[],reviewer:"",notes:""};
  const file=path.join(f.collectionDir,"collecting.json");await fs.writeFile(file,JSON.stringify(initial));
  const edited=JSON.stringify({...initial,notes:"Human work in progress"});let calls=0;
  const urls=Array.from({length:5},(_,i)=>"https://x.com/PersonA/status/"+(100+i));
  await assert.rejects(collectSocial({...f,now,postUrls:urls,fetchPages:async selected=>{calls++;if(calls===5)await fs.writeFile(file,edited);return {results:[page(selected[0])],errors:[]};}}),/checkpoint failed.*changed during collection/i);
  assert.equal(await fs.readFile(file,"utf8"),edited);
  const inbox=JSON.parse(await fs.readFile(path.join(f.collectionDir,"inbox.json"),"utf8"));assert.equal(inbox.entries.length,5);
  await assert.rejects(fs.access(path.join(f.collectionDir,"collection.lock")));
  const report=JSON.parse(await fs.readFile(path.join(f.collectionDir,"social-last-run.json"),"utf8"));assert.equal(report.status,"failed");
 }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});
test("daily report retains the completed RSS step while social collection is still executing",async()=>{
 const f=await fixture();try{
  let observed=false;
  await dailyCollection(f.collectionDir,async(name)=>{
   if(name==="social") {const live=JSON.parse(await fs.readFile(path.join(f.collectionDir,"daily-last-run.json"),"utf8"));assert.equal(live.status,"running");assert.equal(live.steps[0].name,"rss");assert.equal(live.steps[0].report.new_items,7);observed=true;}
   return {name,code:0,report:{sources:[],new_items:name==="rss"?7:0}};
  });
  assert.equal(observed,true);
 }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});
