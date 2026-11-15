import {privateCollectionDir} from "./collection-maintenance";
import path from "node:path";
import {parseArgs} from "node:util";
import {cleanupTopics} from "./collection-maintenance";
const {values}=parseArgs({options:{apply:{type:"boolean"}}});
cleanupTopics(privateCollectionDir(),{apply:values.apply}).then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
