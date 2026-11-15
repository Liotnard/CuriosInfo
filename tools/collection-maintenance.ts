import {promises as fs} from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";

export function privateCollectionDir() {
 const dir=path.resolve(process.env.COLLECTION_DIR||"collection");
 const forbidden=[path.resolve(process.env.JSON_DB_DIR||"data"),path.resolve("web"),path.resolve("dist")];
 if(forbidden.some(root=>dir===root||dir.startsWith(root+path.sep)||root.startsWith(dir+path.sep)))throw new Error("Collection must remain separate from source and public directories");
 return dir;
}
export function parisDate(now=new Date()) {
 return new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
}
export function expiresOn(date:string) {
 const [year,month,day]=date.split("-").map(Number);
 const base=new Date(Date.UTC(year,month-1,day));
 if(base.toISOString().slice(0,10)!==date)throw new Error("Invalid folder date");
 const target=new Date(Date.UTC(year,month+2,1));
 const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
 target.setUTCDate(Math.min(day,last));return target.toISOString().slice(0,10);
}
async function inspect(dir:string):Promise<{digest:string;blocked:string[]}> {
 const hash=createHash("sha256"),blocked:string[]=[];
 async function walk(folder:string) {
  for(const entry of (await fs.readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
   const file=path.join(folder,entry.name),relative=path.relative(dir,file),stat=await fs.lstat(file);
   if(stat.isSymbolicLink())throw new Error("Symbolic link or junction in archive");
   hash.update(relative+"\0");
   if(stat.isDirectory()) {await walk(file);continue;}
   if(!stat.isFile())throw new Error("Unsupported archive entry");
   const bytes=await fs.readFile(file);hash.update(bytes);
   if(entry.name===".keep"||entry.name.endsWith(".lock"))blocked.push(relative);
   if(entry.name.endsWith(".json")) {
    const data=JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/,""));
    if(entry.name==="inbox.json"&&(!Array.isArray(data.entries)||data.entries.some((c:any)=>c.status!=="accepted"&&c.status!=="rejected")))blocked.push(relative+": unprocessed inbox");
    if(entry.name==="collecting.json"&&(!Array.isArray(data.candidates)||!Array.isArray(data.decisions)||data.candidates.length||data.decisions.length||data.notes))blocked.push(relative+": unfinished work");
    if(entry.name==="review-decisions.json"&&(!Array.isArray(data.decisions)||data.decisions.some((d:any)=>d.approved!==true)))blocked.push(relative+": unapproved decisions");
   }
  }
 }
 await walk(dir);return {digest:hash.digest("hex"),blocked};
}
export async function cleanupTopics(collectionDir:string,options:{apply?:boolean;now?:Date}={}) {
 const absolute=path.resolve(collectionDir),rootStat=await fs.lstat(absolute);
 if(rootStat.isSymbolicLink()||!rootStat.isDirectory())throw new Error("Collection root must be a real directory");
 const root=await fs.realpath(absolute),lockPath=path.join(root,"collection.lock");
 const lock=await fs.open(lockPath,"wx").catch(()=>{throw new Error("Collection is locked; cleanup skipped");});
 let activeText="";
 try{activeText=await fs.readFile(path.join(root,"collecting.json"),"utf8");JSON.parse(activeText);}catch(error:any){if(error.code!=="ENOENT"){await lock.close();await fs.rm(lockPath,{force:true});throw error;}}
 const report:{dry_run:boolean;date:string;folders:{name:string;status:string;reason?:string;expires_on?:string}[]}={dry_run:!options.apply,date:parisDate(options.now),folders:[]};
 try {
  for(const entry of (await fs.readdir(root,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
   const match=/^(\d{4}-\d{2}-\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/.exec(entry.name);
   if(!match)continue;
   const item:{name:string;status:string;reason?:string;expires_on?:string}={name:entry.name,status:"protected"};report.folders.push(item);
   try {
    item.expires_on=expiresOn(match[1]);
    // "More than three months": retain the anniversary date itself.
    if(report.date<=item.expires_on){item.status="recent";continue;}
    if(activeText.includes(entry.name))throw new Error("Archive is referenced by collecting.json");
    const folder=path.resolve(root,entry.name),stat=await fs.lstat(folder);
    if(path.dirname(folder)!==root||stat.isSymbolicLink()||!stat.isDirectory()||await fs.realpath(folder)!==folder)throw new Error("Unsafe archive path");
    const marker=path.join(folder,"retention.json"),markerStat=await fs.lstat(marker);
    if(markerStat.isSymbolicLink()||!markerStat.isFile())throw new Error("Unsafe retention marker");
    const retention=JSON.parse(await fs.readFile(marker,"utf8"));
    if(retention.version!==1||retention.closed!==true)throw new Error("Archive has not been marked closed by its operator");
    const before=await inspect(folder);
    if(before.blocked.length)throw new Error(before.blocked.join("; "));
    item.status="eligible";
    if(options.apply) {
     if((await inspect(folder)).digest!==before.digest)throw new Error("Archive changed during cleanup");
     const finalStat=await fs.lstat(folder);
     if(finalStat.isSymbolicLink()||path.dirname(await fs.realpath(folder))!==root)throw new Error("Unsafe archive path");
     await fs.rm(folder,{recursive:true});item.status="deleted";
    }
   }catch(error:any){item.status="protected";item.reason=error.code==="ENOENT"?"No retention.json closure marker":error.message;}
  }
  return report;
 }finally{await lock.close();await fs.rm(lockPath,{force:true});}
}
