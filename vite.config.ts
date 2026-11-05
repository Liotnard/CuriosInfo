import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {fileURLToPath} from "node:url";
const resolve=(name:string)=>fileURLToPath(new URL(name,import.meta.url));
export default defineConfig({plugins:[react()],root:resolve("./web"),resolve:{alias:{"@":resolve("./web/src"),"@shared":resolve("./shared")}},build:{outDir:resolve("./dist"),emptyOutDir:true},server:{host:"127.0.0.1"}});
