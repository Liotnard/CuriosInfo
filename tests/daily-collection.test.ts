import {test} from "node:test";
import assert from "node:assert/strict";
import {promises as fs} from "node:fs";
import path from "node:path";
import {tmpdir} from "node:os";
import {expiresOn,parisDate,cleanupTopics} from "../tools/collection-maintenance";
import {runCollectors,dailyCollection,collectionHealth,type RunStep} from "../tools/daily-collection";

async function fixture(){return fs.mkdtemp(path.join(tmpdir(),"curios-daily-"));}
const now=new Date("2026-11-15T12:00:00Z");
async function archive(root:string,name:string,extra:Record<string,unknown>={}) {
 const dir=path.join(root,name);await fs.mkdir(dir);
 await fs.writeFile(path.join(dir,"retention.json"),JSON.stringify({version:1,closed:true}));
 for(const [file,value] of Object.entries(extra))await fs.writeFile(path.join(dir,file),JSON.stringify(value));
 return dir;
}
test("retention uses Paris dates and three calendar months with clamped month ends",()=>{
 assert.equal(parisDate(new Date("2026-11-14T23:30:00Z")),"2026-11-15");
 assert.equal(expiresOn("2026-01-31"),"2026-04-30");
 assert.equal(expiresOn("2023-11-30"),"2024-02-29");
 assert.equal(expiresOn("2026-11-15"),"2027-02-15");
 assert.throws(()=>expiresOn("2026-02-30"));
});
test("cleanup defaults to simulation and deletes only closed expired thematic archives",async()=>{
 const root=await fixture();try {
  const old=await archive(root,"2026-08-14-closed");
  await archive(root,"2026-08-15-exact-anniversary");
  await archive(root,"2026-11-10-recent");
  await fs.mkdir(path.join(root,"2026-08-01-not-closed"));
  await archive(root,"2026-08-01-pending",{"inbox.json":{entries:[{status:"pending"}]}});
  await archive(root,"2026-08-01-draft",{"review-decisions.json":{decisions:[{approved:false}]}});
  await archive(root,"2026-08-01-work",{"collecting.json":{candidates:[],decisions:[{}]}});
  await archive(root,"2026-08-01-keep",{".keep":true});
  await archive(root,"2026-08-01-invalid",{"inbox.json":{}});
  await fs.mkdir(path.join(root,"import-backups"));
  await fs.writeFile(path.join(root,"inbox.json"),'{"entries":[]}');
  const before=await fs.readFile(path.join(root,"inbox.json"),"utf8");
  const dry=await cleanupTopics(root,{now});
  assert.equal(dry.dry_run,true);assert.equal(dry.folders.find(f=>f.name==="2026-08-14-closed")?.status,"eligible");
  await fs.access(old);
  const applied=await cleanupTopics(root,{now,apply:true});
  assert.deepEqual(applied.folders.filter(f=>f.status==="deleted").map(f=>f.name),["2026-08-14-closed"]);
  await assert.rejects(fs.access(old));
  await fs.access(path.join(root,"import-backups"));
  assert.equal(await fs.readFile(path.join(root,"inbox.json"),"utf8"),before);
  assert.equal(applied.folders.find(f=>f.name.endsWith("exact-anniversary"))?.status,"recent");
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test("cleanup refuses shared collection lock and symbolic/junction traversal",async()=>{
 const root=await fixture(),outside=await fixture();try {
  await fs.writeFile(path.join(outside,"precious.txt"),"keep");
  const old=await archive(root,"2026-01-01-with-junction");
  await fs.symlink(outside,path.join(old,"linked"),process.platform==="win32"?"junction":"dir");
  const report=await cleanupTopics(root,{now,apply:true});
  assert.equal(report.folders[0].status,"protected");await fs.access(path.join(outside,"precious.txt"));
  await fs.writeFile(path.join(root,"collection.lock"),"busy");
  await assert.rejects(cleanupTopics(root,{now,apply:true}),/locked/);
  await assert.rejects(cleanupTopics(path.join(old,"linked"),{now,apply:true}),/real directory/);
 }finally{await fs.rm(root,{recursive:true,force:true});await fs.rm(outside,{recursive:true,force:true});}
});
test("daily collection retries only transient failed RSS sources, continues social and reports partial coverage",async()=>{
 const calls:{file:string;args:string[]}[]=[];
 const run:RunStep=async(name,file,args)=>{
  calls.push({file,args});
  if(name==="rss")return {name,code:0,report:{sources:[{actorId:1,status:"error",error:"HTTP 503"},{actorId:2,status:"error",error:"HTTP 403"}],new_items:2}};
  if(name==="rss-retry")return {name,code:0,report:{sources:[{actorId:1,status:"ok"}],new_items:1}};
  if(name==="social")return {name,code:2,report:{incomplete:true,sources:[{actorId:3,platform:"x",status:"unavailable",errors:["fetch failed"]},{actorId:4,platform:"instagram",status:"unavailable",errors:["Account belongs to several actor records"]}]}};
  assert.equal(name,"social-retry-x");return {name,code:0,report:{incomplete:false,sources:[{actorId:3,platform:"x",status:"public_posts_read",errors:[]}]}};
 };
 const report=await runCollectors(run,async()=>{});
 assert.deepEqual(calls[1].args,["--actors","1"]);
 assert.deepEqual(calls[3].args,["--actors","3","--platforms","x"]);
 assert.deepEqual(report.rss_remaining.map(s=>s.actorId),[2]);
 assert.deepEqual(report.social_remaining.map(s=>s.actorId),[4]);
 assert.ok(report.warnings.length);
});
test("RSS fatal errors do not suppress social pass and stale/running states remain visible",async()=>{
 const calls:string[]=[];
 const result=await runCollectors(async(name)=>{calls.push(name);return name==="rss"?{name,code:1,error:"failed"}:{name,code:0,report:{sources:[]}};});
 assert.deepEqual(calls,["rss","social"]);assert.ok(result.warnings.length);
 assert.equal(collectionHealth(null,false,now).status,"missing");
 assert.equal(collectionHealth({status:"ok",started_at:"2026-11-13T12:00:00Z"},false,now).status,"stale");
 assert.equal(collectionHealth({status:"running",started_at:now.toISOString()},true,now).status,"running");
 assert.equal(collectionHealth({status:"running",started_at:now.toISOString()},false,now).status,"interrupted");
 assert.equal(collectionHealth({status:"running",started_at:"2026-11-14T01:00:00Z"},true,now).status,"interrupted");
});
test("daily runner persists completion, warns on cleanup failure and refuses another run",async()=>{
 const root=await fixture();try {
  const run:RunStep=async(name)=>({name,code:0,report:{sources:[],new_items:1}});
  const report=await dailyCollection(root,run,async()=>{throw new Error("Collection is locked");});
  assert.equal(report.status,"partial");assert.ok(report.finished_at);
  const stored=JSON.parse(await fs.readFile(path.join(root,"daily-last-run.json"),"utf8"));
  assert.equal(stored.status,"partial");assert.equal(stored.steps.length,2);
  assert.match(await fs.readFile(path.join(root,"daily-last-run.md"),"utf8"),/Collection is locked/);
  await fs.writeFile(path.join(root,"daily.lock"),"busy");
  await assert.rejects(dailyCollection(root,run),/locked/);
  assert.equal(await fs.readFile(path.join(root,"daily-last-run.json"),"utf8"),JSON.stringify(stored,null,2)+"\n");
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test("active references and malformed operator files protect archives and release the cleanup lock",async()=>{
 const root=await fixture();try {
  const archiveDir=await archive(root,"2026-01-01-active-evidence");
  await fs.writeFile(path.join(root,"collecting.json"),JSON.stringify({notes:"See collection/2026-01-01-active-evidence/proof.json"}));
  const report=await cleanupTopics(root,{now,apply:true});
  assert.equal(report.folders[0].status,"protected");await fs.access(archiveDir);
  await fs.writeFile(path.join(root,"collecting.json"),'{"notes":');
  await assert.rejects(cleanupTopics(root,{now,apply:true}));
  await assert.rejects(fs.access(path.join(root,"collection.lock")));
  await fs.access(archiveDir);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
