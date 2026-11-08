import {promises as fs} from "node:fs";
import path from "node:path";
import {parseArgs} from "node:util";
const {values}=parseArgs({options:{file:{type:"string"}}});
async function main(){
 const dir=path.resolve(process.env.COLLECTION_DIR||"collection");
 const proposals=JSON.parse(await fs.readFile(path.join(dir,"topic-proposals.json"),"utf8"));
 const decisions={version:1,reviewer:"",decisions:proposals.proposals.map((p:any,i:number)=>({id:`review-${p.proposed_topic.slug}-${i+1}`,action:"create_topic",approved:false,sources_verified:false,candidate_keys:p.candidate_keys,publication_dates:{},topic:{...p.proposed_topic,summary:p.summary??"",angleNote:p.angleNote??null}}))};
 const file=path.resolve(values.file||path.join(dir,"review-decisions.json"));await fs.writeFile(file,JSON.stringify(decisions,null,2)+"\n",{flag:"wx"});console.log(`Created ${file}; all decisions remain unapproved. Existing files are never overwritten.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
