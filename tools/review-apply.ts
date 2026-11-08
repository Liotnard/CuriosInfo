import {promises as fs} from "node:fs";
import path from "node:path";
import {parseArgs} from "node:util";
import {applyReview,recoverReview} from "./review-import";
const {values}=parseArgs({options:{file:{type:"string"},"dry-run":{type:"boolean"},recover:{type:"boolean"}}});
async function main(){
 const dataDir=path.resolve(process.env.JSON_DB_DIR||"data"),collectionDir=path.resolve(process.env.COLLECTION_DIR||"collection");
 if([dataDir,path.resolve("web"),path.resolve("dist")].some(root=>collectionDir===root||collectionDir.startsWith(root+path.sep)))throw new Error("Review backups must remain outside source and public directories");
 if(values.recover){if(values.file||values["dry-run"])throw new Error("Recovery cannot be combined with other options");console.log(await recoverReview(dataDir,collectionDir));return;}
 const decisions=JSON.parse(await fs.readFile(path.resolve(values.file||path.join(collectionDir,"review-decisions.json")),"utf8"));
 console.log(await applyReview({dataDir,collectionDir,decisions,dryRun:values["dry-run"]}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
