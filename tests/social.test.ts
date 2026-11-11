import {test} from "node:test";
import assert from "node:assert/strict";
import {promises as fs} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {buildSocialSources,candidateFromPage,ownPostLinks,matchesTerms,profile,tinyfishFetcher,type SocialSource,type Page} from "../tools/social-sources";
import {collectSocial,youtubeFeed} from "../tools/social-collection";
import {parseFeed} from "../tools/collection";
import {planImport} from "../tools/review-import";
const now=new Date("2026-11-11T08:00:00Z");
const source:SocialSource={actorId:400,actor_name:"Test Person",platform:"x",account:"TestPerson",url:"https://x.com/TestPerson",references:[]};
const page:Page={url:"https://x.com/TestPerson/status/123",author:source.url,published_date:"2026-11-10T10:00:00Z",description:"Réaction à Chelles",links:[],text:{type:"document",children:[{type:"heading",level:1,text:"Réaction à Chelles"},{type:"paragraph",text:"An unrelated reply"}]}};
async function fixture(){const dir=await fs.mkdtemp(path.join(tmpdir(),"curios-social-")),dataDir=path.join(dir,"data"),collectionDir=path.join(dir,"collection");await fs.mkdir(dataDir);await fs.writeFile(path.join(dataDir,"actors.json"),JSON.stringify([{id:400,name:"Test Person",feed_url:source.url}]));await fs.writeFile(path.join(dataDir,"mapactors.json"),"[]");await fs.writeFile(path.join(dataDir,"articles.json"),"[]");return {dir,dataDir,collectionDir};}
test("inventory reads all address fields, deduplicates profile sections and detects shared ownership",()=>{
 const actors=[{id:1,name:"A",feed_url:"https://x.com/Same",additional_urls:["https://x.com/Same/media"]},{id:2,name:"B",feed_url:"https://x.com/Same"}];
 const rows=buildSocialSources(actors,[{id:1,urls:["https://www.youtube.com/channel/UCAcAnMF0OrCtUep3Y4M-ZPw","https://www.youtube.com/@alias"]}]);
 assert.equal(rows.filter(s=>s.platform==="x").length,2);assert.ok(rows.filter(s=>s.platform==="x").every(s=>s.ambiguous));assert.equal(rows.filter(s=>s.platform==="youtube").length,1);
 assert.equal(profile("https://www.youtube.com/%40handle/videos")?.account,"@handle");assert.equal(profile("https://x.com/i/flow/login"),null);assert.equal(profile("https://user:password@x.com/User"),null);
});
test("only owner post URLs are discovered, not mentions, replies or tracking/photo aliases",()=>{
 const links=ownPostLinks(source,{...page,links:[page.url,page.url+"/photo/1","https://x.com/Other/status/456","https://x.com/compose/post?in_reply_to=123","javascript:alert(1)"]});assert.deepEqual(links,[page.url]);
 assert.equal(ownPostLinks(source,{...page,links:["https://x.com:8443/TestPerson/status/1"]}).length,0);
});
test("social evidence requires original author, date, content and known ownership",()=>{
 const c=candidateFromPage(source,page,now);assert.equal(c.origin,"social_public_page");assert.equal(c.actorId,400);assert.equal(c.excerpt,"Réaction à Chelles");assert.equal(c.source_profile,source.url);assert.equal(c.content_kind,"post");assert.equal(c.feed_url,null);
 assert.throws(()=>candidateFromPage(source,{...page,author:"https://x.com/Other"},now),/author/);
 assert.throws(()=>candidateFromPage(source,{...page,published_date:null},now),/date/);
 assert.throws(()=>candidateFromPage(source,{...page,published_date:"2026-11-12T00:00:00Z"},now),/date/);
 assert.throws(()=>candidateFromPage({...source,ambiguous:true},page,now),/ownership/);
 assert.throws(()=>candidateFromPage(source,{...page,text:null,description:"Log in to X"},now),/unavailable/);
 assert.ok(matchesTerms("Élue à CHELLES",["chelles"]));
});
test("collection imports direct social evidence, preserves RSS state, keeps approval manual and deduplicates",async()=>{
 const f=await fixture();try{
 const first=await collectSocial({...f,now,pages:[page],terms:["chelles"]});assert.equal(first.new_items,1);assert.equal(first.incomplete,false);assert.equal(first.exhaustive,false);
 const before=await fs.readFile(path.join(f.collectionDir,"inbox.json"),"utf8");const inbox=JSON.parse(before);assert.equal(inbox.entries[0].status,"pending");
 const second=await collectSocial({...f,now,pages:[page],terms:["chelles"],dryRun:true});assert.equal(second.new_items,0);assert.equal(second.duplicates,1);assert.equal(await fs.readFile(path.join(f.collectionDir,"inbox.json"),"utf8"),before);
 const plan=planImport({actors:[{id:400}],topics:[{id:1,slug:"test",title:"Test",summary:"Test",angleNote:null,startAt:null,endAt:null,created_at:now.toISOString(),updatedAt:now.toISOString()}],articles:[],inbox,decisions:{version:1,reviewer:"Test",decisions:[{id:"link",action:"link_topic",topicId:1,approved:true,sources_verified:true,candidate_keys:[inbox.entries[0].key]}]}});
 assert.equal(plan.articles[0].source_platform,"x");assert.equal(plan.articles[0].content_kind,"post");
 }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});
test("missing browser access and ambiguous authors cannot become a no-coverage conclusion; import lock is respected",async()=>{
 const f=await fixture();try{
 const report=await collectSocial({...f,now,dryRun:true});assert.equal(report.new_items,0);assert.equal(report.incomplete,true);assert.equal(report.unavailable,1);
 assert.equal(report.sources[0].status,"unavailable");
 await fs.writeFile(path.join(f.dataDir,".review-import.lock"),"busy");await assert.rejects(collectSocial({...f,now,pages:[page]}),/review import/);
 }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});
test("browser request budget, partial provider failures and collection lock preserve inbox integrity",async()=>{
 const f=await fixture();try{
 let calls=0;const report=await collectSocial({...f,now,maxPages:1,fetchPages:async urls=>{calls++;return {results:[{...page,url:urls[0],links:[page.url]}],errors:[]};}});assert.equal(calls,1);assert.equal(report.incomplete,true);assert.equal(report.unverified,1);assert.equal(report.new_items,0);
 await fs.writeFile(path.join(f.collectionDir,"collection.lock"),"busy");await assert.rejects(collectSocial({...f,now,pages:[page]}),/locked/);
 }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});
test("TinyFish uses its documented endpoint, never leaks keys in HTTP errors and handles per-URL failures",async()=>{
 const fetcher=tinyfishFetcher("secret",async (url,init)=>{assert.equal(url,"https://api.fetch.tinyfish.ai");assert.equal((init!.headers as any)["X-API-Key"],"secret");assert.equal(init!.redirect,"error");return new Response(JSON.stringify({results:[],errors:[{url:page.url,error:"login_required"}]}),{status:200});});
 assert.equal((await fetcher([page.url])).errors[0].error,"login_required");
 await assert.rejects(tinyfishFetcher("secret",async()=>new Response("secret",{status:401}))([page.url]),/^Error: Browser provider HTTP 401$/);
});
test("YouTube resolves declared owner feed and retains media descriptions; unrelated channels are rejected",async()=>{
 const id="UCAcAnMF0OrCtUep3Y4M-ZPw";
 const source:SocialSource={actorId:1,actor_name:"Video",platform:"youtube",account:"@test",url:"https://www.youtube.com/@test",references:[]};
 const feed=await youtubeFeed(source,async()=>new Response('<html><link rel="alternate" type="application/atom+xml" href="https://www.youtube.com/feeds/videos.xml?channel_id='+id+'"></html>'));
 assert.ok(feed.endsWith(id));
 const parsed=parseFeed('<feed xmlns:media="http://search.yahoo.com/mrss/"><entry><title>Daily news</title><link href="https://www.youtube.com/watch?v=abc"/><published>2026-11-10T08:00:00Z</published><media:group><media:description>Chelles mentioned here</media:description></media:group></entry></feed>',feed);assert.equal(parsed[0].excerpt,"Chelles mentioned here");
 const f=await fixture();try{
 await fs.writeFile(path.join(f.dataDir,"actors.json"),JSON.stringify([{id:1,name:"Video",feed_url:"https://www.youtube.com/channel/"+id}]));
 const report=await collectSocial({...f,now,dryRun:true,download:async url=>({url,xml:'<feed><yt:channelId>WRONG</yt:channelId></feed>'})});assert.equal(report.new_items,0);assert.equal(report.incomplete,true);
 }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});

test("alternative party accounts cannot be silently counted as a person's own publications",()=>{
 const sources=buildSocialSources([{id:1,name:"Person",feed_url:"https://x.com/Person"}],[{id:1,urls:["https://x.com/Party"]}]);
 assert.equal(sources.find(s=>s.account==="Party")?.scope_review,true);
 assert.throws(()=>candidateFromPage({...source,scope_review:true},page,now),/ownership/);
});
test("daily browser budget survives separate runs and blocks additional provider calls",async()=>{
 const f=await fixture();try{
 let calls=0;const fetchPages=async(urls:string[])=>{calls++;return {results:[],errors:[{url:urls[0],error:"login_required"}]};};
 await collectSocial({...f,now,fetchPages,maxDailyPages:1});
 const report=await collectSocial({...f,now,fetchPages,maxDailyPages:1});assert.equal(calls,1);assert.equal(report.incomplete,true);assert.match(JSON.stringify(report.sources),/Daily browser page budget/);
 }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});
test("a verified owner YouTube Atom feed creates an attributable video candidate",async()=>{
 const f=await fixture();const id="UCAcAnMF0OrCtUep3Y4M-ZPw";try{
 await fs.writeFile(path.join(f.dataDir,"actors.json"),JSON.stringify([{id:1,name:"Video",feed_url:"https://www.youtube.com/channel/"+id}]));
 const xml='<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><yt:channelId>'+id.slice(2)+'</yt:channelId><author><uri>https://www.youtube.com/channel/'+id+'</uri></author><entry><title>Chelles</title><link href="https://www.youtube.com/shorts/abcdef"/><published>2026-11-10T10:00:00Z</published></entry></feed>';
 const result=await collectSocial({...f,now,download:async url=>({url,xml})});assert.equal(result.new_items,1);
 const state=JSON.parse(await fs.readFile(path.join(f.collectionDir,"inbox.json"),"utf8"));assert.equal(state.entries[0].content_kind,"video");assert.equal(state.entries[0].origin,"youtube_feed");assert.equal(state.entries[0].actorId,1);
 }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});
