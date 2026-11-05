import path from "node:path";
import { publishData } from "./publication";
const source = path.resolve(process.env.JSON_DB_DIR || "data");
const output = path.resolve(process.env.PUBLIC_DATA_DIR || "web/public/data");
if (source === output || source.startsWith(output + path.sep) || output.startsWith(source + path.sep)) throw new Error("Source and publication directories must be separate");
publishData(source,output).then(result=>console.log("Publication:",result)).catch(error=>{console.error(error);process.exitCode=1;});
