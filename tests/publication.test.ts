import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,writeFile,readFile,rm,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {publishData} from "../tools/publication";
test("publication validates data, strips private fields and preserves the active version on failure",async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),"curios-publication-"));
 const source=path.join(dir,"source"),output=path.join(dir,"public");await mkdir(source);
 const date="2026-01-01T00:00:00Z";
 const actor={id:1,name:"Source",slug:"source",actor_type:"presse",feed_url:"",lib_autor:-2,indiv_col:1,natio_mon:0,prog_cons:3,created_at:date,updated_at:date,privateKey:"secret"};
 const topic={id:1,title:"Sujet",slug:"sujet",summary:null,angle_note:null,start_at:null,end_at:null,created_at:date,updated_at:date};
 const article={id:1,topicId:1,actorId:1,url:"https://example.org/article",title:"Article",published_at:date,created_at:date,privateNotes:"secret"};
 const write=async(name:string,data:unknown)=>writeFile(path.join(source,name+".json"),JSON.stringify(data));
 try{
 await write("actors",[actor]);await write("topics",[topic]);await write("articles",[article]);
 const first=await publishData(source,output);
 const manifest=await readFile(path.join(output,"manifest.json"),"utf8");
 const detail=JSON.parse(await readFile(path.join(output,"releases",first.version,"topics/sujet.json"),"utf8"));
 assert.equal(detail.articles[0].actor.libAutor,-2);assert.equal(detail.articles[0].privateNotes,undefined);assert.equal(detail.actorInTopic[0].privateKey,undefined);
 await write("articles",[{...article,actorId:999}]);await assert.rejects(publishData(source,output),/missing actor/);
 assert.equal(await readFile(path.join(output,"manifest.json"),"utf8"),manifest);
 await write("articles",[{...article,url:"javascript:alert(1)"}]);await assert.rejects(publishData(source,output));
 await write("articles",[article]);await write("topics",[{...topic,slug:"../escape"}]);await assert.rejects(publishData(source,output));
 await write("topics",[topic,topic]);await assert.rejects(publishData(source,output),/Duplicate/);
 await write("topics",[{...topic,title:"Nouveau titre"}]);const second=await publishData(source,output);
 assert.notEqual(first.version,second.version);
 assert.equal(JSON.parse(await readFile(path.join(output,"releases",first.version,"topics/sujet.json"),"utf8")).title,"Sujet");
 assert.equal(JSON.parse(await readFile(path.join(output,"releases",second.version,"topics/sujet.json"),"utf8")).title,"Nouveau titre");
 }finally{await rm(dir,{recursive:true,force:true});}
});
