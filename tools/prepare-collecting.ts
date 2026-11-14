import path from "node:path";
import {prepareCollecting} from "./collecting";
async function main(){
 const dataDir=path.resolve(process.env.JSON_DB_DIR||"data"),dir=path.resolve(process.env.COLLECTION_DIR||"collection");
 if([dataDir,path.resolve("web"),path.resolve("dist")].some(root=>dir===root||dir.startsWith(root+path.sep)))throw new Error("Collecting must remain private and outside public/source data directories");
 console.log(await prepareCollecting(dataDir,dir));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
