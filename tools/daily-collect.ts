import {privateCollectionDir} from "./collection-maintenance";
import path from "node:path";
import {dailyCollection} from "./daily-collection";
dailyCollection(privateCollectionDir()).then(report=>{
 console.log(JSON.stringify({status:report.status,warnings:report.warnings,started_at:report.started_at,finished_at:report.finished_at},null,2));
 process.exitCode=report.status==="ok"?0:report.status==="partial"?2:1;
}).catch(error=>{console.error(error.message);process.exitCode=1;});
