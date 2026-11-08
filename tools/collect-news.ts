import {promises as fs} from "node:fs";
import path from "node:path";
import {parseArgs} from "node:util";
import {collectNews,ConfigSchema} from "./collection";
const {values}=parseArgs({options:{all:{type:"boolean"},actors:{type:"string"},"dry-run":{type:"boolean"}}});
async function main(){
 const dataDir=path.resolve(process.env.JSON_DB_DIR||"data"),collectionDir=path.resolve(process.env.COLLECTION_DIR||"collection");
 if([dataDir,path.resolve("web"),path.resolve("dist")].some(root=>collectionDir===root||collectionDir.startsWith(root+path.sep)))throw new Error("Collection must remain separate from sources and public files");
 for(const name of [".review-import.json",".review-import.lock"]){try{await fs.access(path.join(dataDir,name));}catch(e:any){if(e.code==="ENOENT")continue;throw e;}throw new Error("Finish or recover the review import before collection");}
 const config=ConfigSchema.parse(JSON.parse(await fs.readFile(path.resolve("data/collection-config.json"),"utf8")));
 if(values.all&&values.actors)throw new Error("Choose --all or --actors, not both");
 if(values.all){const actors=JSON.parse(await fs.readFile(path.join(dataDir,"actors.json"),"utf8"));config.actorIds=actors.filter((a:any)=>a.source_qualification?.status==="feed_verified").map((a:any)=>a.id);}
 if(values.actors)config.actorIds=values.actors.split(",").map(Number);
 config.actorIds=[...new Set(config.actorIds)];
 const report=await collectNews({dataDir,collectionDir,config:ConfigSchema.parse(config),dryRun:values["dry-run"]});
 console.log(JSON.stringify(report,null,2));
 if(report.errors===report.sources.length)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
