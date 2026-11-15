import {privateCollectionDir} from "./collection-maintenance";
import path from "node:path";
import {promises as fs} from "node:fs";
import {collectionHealth} from "./daily-collection";
async function main(){
 const dir=privateCollectionDir();let report=null,locked=false;
 try{report=JSON.parse(await fs.readFile(path.join(dir,"daily-last-run.json"),"utf8"));}catch(error:any){if(error.code!=="ENOENT")throw error;}
 try{await fs.access(path.join(dir,"daily.lock"));locked=true;}catch(error:any){if(error.code!=="ENOENT")throw error;}
 const health=collectionHealth(report,locked);console.log(JSON.stringify({...health,last_started_at:report?.started_at,warnings:report?.warnings??[]},null,2));
 process.exitCode=["ok","running"].includes(health.status)?0:2;
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
