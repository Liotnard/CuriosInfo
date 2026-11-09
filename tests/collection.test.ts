import {test} from "node:test";
import assert from "node:assert/strict";
import {promises as fs} from "node:fs";
import path from "node:path";
import {tmpdir} from "node:os";
import {parseFeed,canonicalUrl,collectNews,CandidateSchema} from "../tools/collection";
const now=new Date("2026-11-08T12:00:00Z");
const config={actorIds:[1,2],maxAgeDays:3,maxPerSource:20,maxNewItems:100,concurrency:2};
const item=(url:string,date="2026-11-08T10:00:00Z")=>`<item><title>Title &amp; context</title><link>${url.replaceAll("&","&amp;")}</link><pubDate>${date}</pubDate><description><![CDATA[<b>Summary</b>]]></description></item>`;
const rss=(items:string)=>`<rss version="2.0"><channel><title>Test</title>${items}</channel></rss>`;
async function fixture(){
 const dir=await fs.mkdtemp(path.join(tmpdir(),"curios-collect-"));const dataDir=path.join(dir,"data");await fs.mkdir(dataDir);
 await fs.writeFile(path.join(dataDir,"actors.json"),JSON.stringify([1,2].map(id=>({id,name:`Source ${id}`,feed_url:`https://source${id}.example.org/feed`,source_qualification:{status:"feed_verified"}}))));
 await fs.writeFile(path.join(dataDir,"articles.json"),JSON.stringify([{url:"https://example.org/already-published"}]));
 return {dir,dataDir,collectionDir:path.join(dir,"collection")};
}
test("RSS/Atom parsing, safe metadata and conservative URL normalization",()=>{
 assert.equal(canonicalUrl("https://example.org/story?b=2&utm_source=feed&a=1#section"),"https://example.org/story?a=1&b=2");
 assert.throws(()=>canonicalUrl("javascript:alert(1)"));
 const r=parseFeed(rss(item("https://example.org/story")),"https://example.org/feed");
 assert.equal(r[0].title,"Title & context");assert.equal(r[0].excerpt,"Summary");
 const atom=parseFeed('<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>News</title><link rel="self" href="/entry.xml"/><link rel="alternate" href="/news"/><updated>2026-11-08T10:00:00Z</updated></entry></feed>',"https://example.org/feed");
 assert.equal(atom[0].url,"https://example.org/news");assert.equal(atom[0].date_basis,"updated");
 assert.equal(parseFeed('<rss><channel><item><title>Missing link</title></item></channel></rss>',"https://example.org/feed")[0].url,undefined);
 assert.equal(parseFeed('<rss><channel><item><title>Opaque GUID</title><guid>entry123</guid></item></channel></rss>',"https://example.org/feed")[0].url,undefined);
 assert.throws(()=>parseFeed('<html><body>Blocked</body></html>',"https://example.org"));
});
test("collection deduplicates published and pending articles, validates dates and survives source failures",async()=>{
 const f=await fixture();try{
 const before=await fs.readFile(path.join(f.dataDir,"articles.json"),"utf8");
 const download=async(url:string)=>{if(url.includes("source2"))throw new Error("HTTP 403");return {url,xml:rss(item("https://example.org/new?utm_source=rss")+item("https://example.org/new")+item("https://example.org/already-published")+item("https://example.org/old","2025-01-01")+item("https://example.org/future","2030-01-01")+item("https://example.org/invalid","bad"))};};
 const first=await collectNews({...f,config,now,download});assert.equal(first.new_items,1);assert.equal(first.errors,1);assert.equal(first.old_items,1);assert.equal(first.invalid_items,2);
 const inbox=JSON.parse(await fs.readFile(path.join(f.collectionDir,"inbox.json"),"utf8"));assert.equal(inbox.entries[0].status,"pending");assert.equal(inbox.entries[0].url,"https://example.org/new");assert.equal(inbox.entries[0].actorId,1);
 const second=await collectNews({...f,config,now,download});assert.equal(second.new_items,0);
 assert.equal(await fs.readFile(path.join(f.dataDir,"articles.json"),"utf8"),before);
 }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});
test("caps leave articles recoverable in subsequent runs; dry-run and locking preserve state",async()=>{
 const f=await fixture();try{
 const download=async(url:string)=>({url,xml:rss(item("https://example.org/a")+item("https://example.org/b"))});
 const limited={...config,actorIds:[1],maxNewItems:1};
 assert.equal((await collectNews({...f,config:limited,now,download,dryRun:true})).new_items,1);
 await assert.rejects(fs.readFile(path.join(f.collectionDir,"inbox.json")),{code:"ENOENT"});
 assert.equal((await collectNews({...f,config:limited,now,download})).new_items,1);
 assert.equal((await collectNews({...f,config:limited,now,download})).new_items,1);
 const before=await fs.readFile(path.join(f.collectionDir,"inbox.json"),"utf8");
 await fs.writeFile(path.join(f.collectionDir,"collection.lock"),"another process");
 await assert.rejects(collectNews({...f,config:limited,now,download}),/locked/);
 assert.equal(await fs.readFile(path.join(f.collectionDir,"inbox.json"),"utf8"),before);
 }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});

test("historical web research has explicit provenance and does not pretend to come from RSS",()=>{
 const base={key:"a".repeat(64),urlHash:"a".repeat(64),actorId:1,actor_name:"Source",url:"https://example.org/article",title:"Test",excerpt:null,published_at:"2026-10-23T10:00:00.000Z",date_basis:"published",discovered_at:"2026-11-09T00:00:00.000Z",status:"pending"};
 assert.equal(CandidateSchema.parse({...base,feed_url:"https://example.org/feed"}).origin,"rss");
 const manual=CandidateSchema.parse({...base,feed_url:null,origin:"targeted_web_research"});assert.equal(manual.feed_url,null);assert.equal(manual.origin,"targeted_web_research");
 assert.throws(()=>CandidateSchema.parse({...base,feed_url:null,origin:"automatically_verified"}));
});
