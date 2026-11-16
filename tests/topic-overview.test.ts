import {test} from "node:test";
import assert from "node:assert/strict";
import {promises as fs} from "node:fs";
import path from "node:path";
import {tmpdir} from "node:os";
import {createHash} from "node:crypto";
import {TopicSchema} from "../shared/schema";
import {filterTopics,featuredTopic} from "../shared/topics";
import {publishData} from "../tools/publication";
import {planImport} from "../tools/review-import";
const now=Date.parse("2026-11-17T12:00:00Z"),date="2026-11-15T12:00:00Z";
const topic=(id:number,overrides:Record<string,unknown>={})=>TopicSchema.parse({id,slug:"topic-"+id,title:"Topic "+id,summary:null,angleNote:null,startAt:date,endAt:null,created_at:date,updatedAt:date,...overrides});
test("age and category filters combine, exclude archives and preserve chronological order without mutating input",()=>{
 const topics=[topic(1,{category:"social",startAt:"2026-11-15T00:00:00Z"}),topic(2,{category:"politique",startAt:"2026-11-16T00:00:00Z"}),topic(3,{category:"social",startAt:"2026-10-01T00:00:00Z"}),topic(4,{editorialStatus:"archived"})];
 assert.deepEqual(filterTopics(topics,"week","social",now).map(t=>t.id),[1]);
 assert.deepEqual(filterTopics(topics,"all","all",now).map(t=>t.id),[2,1,3]);
 assert.deepEqual(topics.map(t=>t.id),[1,2,3,4]);
 assert.equal(filterTopics(topics,"day","social",now).length,0);
});
test("lead uses article count rather than date of update or number of sources and rejects the seven-day boundary and future dates",()=>{
 const topics=[topic(1,{startAt:"2026-11-09T00:00:00Z",created_at:date,updatedAt:"2026-11-17T11:00:00Z",articleCount:100}),topic(2,{articleCount:18}),topic(3,{startAt:"2026-11-16T00:00:00Z",articleCount:17}),topic(4,{startAt:"2026-11-10T12:00:00Z",articleCount:200}),topic(5,{startAt:"2026-11-18T00:00:00Z",articleCount:300}),topic(6,{articleCount:400,editorialStatus:"archived"})];
 assert.equal(featuredTopic(topics,now)?.id,2);
 assert.equal(featuredTopic([topics[0],topics[3],topics[4],topics[5]],now),undefined);
 assert.equal(featuredTopic([topic(7,{articleCount:0})],now),undefined);
});
test("lead ties prefer the most recent topic and creation date is the fallback for a missing start date",()=>{
 const a=topic(1,{articleCount:10}),b=topic(2,{startAt:null,created_at:"2026-11-16T12:00:00Z",articleCount:10});
 assert.equal(featuredTopic([a,b],now)?.id,2);
 assert.equal(featuredTopic([b,a],now)?.id,2);
 assert.equal(filterTopics([b],"day","all",now).length,0);
 assert.equal(filterTopics([b],"week","all",now).length,1);
});
test("publication computes counters from actual links and excludes archives without deleting source data",async()=>{
 const root=await fs.mkdtemp(path.join(tmpdir(),"curios-overview-")),source=path.join(root,"source"),output=path.join(root,"public");await fs.mkdir(source);
 const actor={id:1,slug:"source",name:"Source",actor_type:"presse",feed_url:"",libAutor:0,indivCol:0,natioMon:0,progCons:0,created_at:date,updatedAt:date};
 const topics=[topic(1,{category:"economie",articleCount:999}),topic(2,{editorialStatus:"archived"})];
 const article={id:1,topicId:1,actorId:1,url:"https://source.example/article",title:"Article",excerpt:null,published_at:date,created_at:date};
 const rows=[article,{...article,id:2,topicId:2,url:"https://source.example/archive"}];
 try{
  for(const [n,v] of [["actors",[actor]],["topics",topics],["articles",rows]] as const)await fs.writeFile(path.join(source,n+".json"),JSON.stringify(v));
  const original=await fs.readFile(path.join(source,"topics.json"),"utf8");
  const result=await publishData(source,output),release=path.join(output,"releases",result.version);
  const index=JSON.parse(await fs.readFile(path.join(release,"index.json"),"utf8"));
  assert.equal(result.topics,1);assert.equal(result.articles,1);assert.equal(index[0].articleCount,1);assert.equal(index[0].category,"economie");
  assert.equal(JSON.parse(await fs.readFile(path.join(release,"topics/topic-1.json"),"utf8")).articleCount,1);
  await assert.rejects(fs.access(path.join(release,"topics/topic-2.json")));
  assert.equal(await fs.readFile(path.join(source,"topics.json"),"utf8"),original);
  await fs.writeFile(path.join(source,"articles.json"),JSON.stringify([article,{...rows[1],actorId:999}]));
  await assert.rejects(publishData(source,output),/missing actor/);
  assert.equal(JSON.parse(await fs.readFile(path.join(output,"manifest.json"),"utf8")).version,result.version);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test("review preserves the chosen category and permits explicit archival without accepting an unknown category",()=>{
 const candidates=[1,2].map(actorId=>{const url="https://source.example/"+actorId,hash=createHash("sha256").update(url).digest("hex");return {key:hash,urlHash:hash,actorId,actor_name:"Source "+actorId,url,title:"Article",excerpt:null,feed_url:"https://source.example/rss",published_at:date,discovered_at:date,date_basis:"published",status:"pending"};});
 const decision={id:"test",action:"create_topic",approved:true,sources_verified:true,candidate_keys:candidates.map(c=>c.key),topic:{title:"Topic",slug:"topic",summary:"Summary",angleNote:null,category:"medias",editorialStatus:"archived"}};
 const input={actors:[{id:1},{id:2}],topics:[],articles:[],inbox:{version:1,entries:candidates},decisions:{version:1,reviewer:"Test",decisions:[decision]}};
 const result=planImport(input);assert.equal(result.topics[0].category,"medias");assert.equal(result.topics[0].editorialStatus,"archived");
 assert.throws(()=>planImport({...input,decisions:{...input.decisions,decisions:[{...decision,topic:{...decision.topic,category:"sport"}}]}}));
});
