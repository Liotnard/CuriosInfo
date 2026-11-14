import {promises as fs} from "node:fs";
import path from "node:path";
import {parseArgs} from "node:util";
import {applyReview,recoverReview} from "./review-import";
const {values}=parseArgs({options:{file:{type:"string"},"dry-run":{type:"boolean"},collecting:{type:"boolean"},recover:{type:"boolean"}}});
async function main(){
 const dataDir=path.resolve(process.env.JSON_DB_DIR||"data"),collectionDir=path.resolve(process.env.COLLECTION_DIR||"collection");
 if([dataDir,path.resolve("web"),path.resolve("dist")].some(root=>collectionDir===root||collectionDir.startsWith(root+path.sep)))throw new Error("Review backups must remain outside source and public directories");
 if(values.recover){if(values.file||values["dry-run"]||values.collecting)throw new Error("Recovery cannot be combined with other options");console.log(await recoverReview(dataDir,collectionDir));return;}
 if(values.collecting&&values.file)throw new Error("Choose collecting.json or an explicit legacy file");
 const collectingExists=await fs.access(path.join(collectionDir,"collecting.json")).then(()=>true,e=>{if(e.code==="ENOENT")return false;throw e;});
 const fromCollecting=!!values.collecting||(!values.file&&collectingExists);
 const decisions=fromCollecting?undefined:JSON.parse(await fs.readFile(path.resolve(values.file||path.join(collectionDir,"review-decisions.json")),"utf8"));
 console.log(await applyReview({dataDir,collectionDir,decisions,fromCollecting,dryRun:values["dry-run"]}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
