import {promises as fs} from "node:fs";
import path from "node:path";
import {spawn} from "node:child_process";
import {randomUUID} from "node:crypto";
import {cleanupTopics} from "./collection-maintenance";

export type Step={name:string;code:number;report?:any;error?:string};
export type RunStep=(name:string,file:string,args:string[])=>Promise<Step>;
export const transient=(value:unknown)=>/HTTP (?:408|429|5\d\d)|timed?\s*out|timeout|fetch failed|ECONN|EAI_AGAIN|ENOTFOUND|network/i.test(JSON.stringify(value));
export function rssFailures(report:any):any[]{return (report?.sources??[]).filter((s:any)=>s.status==="error");}
export function socialFailures(report:any):any[]{return (report?.sources??[]).filter((s:any)=>s.status==="unavailable"||s.status==="no_verified_recent_post"||s.errors?.length);}
export const executeStep:RunStep=(name,file,args)=>new Promise(resolve=>{
 const child=spawn(process.execPath,["--env-file-if-exists=.env","--import","tsx",file,...args],{cwd:process.cwd(),windowsHide:true,stdio:["ignore","pipe","pipe"]});
 let out="",err="";child.stdout.setEncoding("utf8");child.stderr.setEncoding("utf8");
 child.stdout.on("data",s=>{out+=s;});child.stderr.on("data",s=>{err+=s;});
 child.on("error",error=>resolve({name,code:1,error:error.message}));
 child.on("close",code=>{
  let report;try{report=JSON.parse(out);}catch{}
  // Never persist environment variables, headers or arbitrary stack traces.
  const message=err.replaceAll(process.env.TINYFISH_API_KEY||"__NO_KEY__","[REDACTED]").slice(-3000);
  resolve({name,code:code??1,report,error:message||(!report?"Collector returned no JSON report":undefined)});
 });
});
export async function runCollectors(run:RunStep=executeStep,pause=()=>new Promise<void>(resolve=>setTimeout(resolve,3000))) {
 const steps:Step[]=[];
 const rss=await run("rss","tools/collect-news.ts",["--all"]);steps.push(rss);
 let rssRemaining=rssFailures(rss.report);
 const retryIds=rssRemaining.filter(s=>transient(s.error)).map(s=>s.actorId);
 if(retryIds.length) {
  await pause();
  const retry=await run("rss-retry","tools/collect-news.ts",["--actors",retryIds.join(",")]);steps.push(retry);
  if(retry.report)rssRemaining=[...rssRemaining.filter(s=>!retryIds.includes(s.actorId)),...rssFailures(retry.report)];
 }
 // RSS failure must not prevent the independent social pass.
 const social=await run("social","tools/collect-social.ts",[]);steps.push(social);
 let socialRemaining=socialFailures(social.report);
 const platforms=[...new Set(socialRemaining.filter(s=>transient(s.errors)).map(s=>s.platform))];
 for(const platform of platforms) {
  const ids=[...new Set(socialRemaining.filter(s=>s.platform===platform&&transient(s.errors)).map(s=>s.actorId))];
  await pause();
  const retry=await run("social-retry-"+platform,"tools/collect-social.ts",["--actors",ids.join(","),"--platforms",platform]);steps.push(retry);
  if(retry.report)socialRemaining=[...socialRemaining.filter(s=>!(s.platform===platform&&ids.includes(s.actorId))),...socialFailures(retry.report)];
 }
 const warnings:string[]=[];
 if(!rss.report)warnings.push("RSS pass failed before a report was produced");
 if(!social.report)warnings.push("Social pass failed before a report was produced");
 if(rssRemaining.length)warnings.push(`${rssRemaining.length} RSS sources remain in error`);
 if(socialRemaining.length)warnings.push(`${socialRemaining.length} social sources remain unverified or inaccessible`);
 if(steps.some(s=>s.error||!s.report))warnings.push("At least one execution failed; inspect steps");
 if(steps.some(s=>s.report?.limited_items||s.report?.sources?.some((r:any)=>r.limited_posts)))warnings.push("A collection limit was reached; coverage is partial");
 // Keep quota/coverage warnings even if a targeted retry happened to succeed.
 if(social.report?.incomplete&&!socialFailures(social.report).length)warnings.push("Social coverage reported incomplete");
 return {steps,warnings,rss_remaining:rssRemaining,social_remaining:socialRemaining};
}
export async function dailyCollection(dir:string,run:RunStep=executeStep,cleanup=cleanupTopics) {
 await fs.mkdir(dir,{recursive:true});
 const lockPath=path.join(dir,"daily.lock"),lock=await fs.open(lockPath,"wx").catch(()=>{throw new Error("Daily collection already locked; inspect the process before removing a stale lock");});
 const report:any={version:1,id:randomUUID(),started_at:new Date().toISOString(),status:"running",pid:process.pid,warnings:[]};
 const save=async()=>{
  const file=path.join(dir,"daily-last-run.json"),tmp=file+".tmp";await fs.writeFile(tmp,JSON.stringify(report,null,2).replaceAll(process.env.TINYFISH_API_KEY||"__NO_KEY__","[REDACTED]")+"\n");await fs.rename(tmp,file);
 };
 try {
  await save();
  Object.assign(report,await runCollectors(run));
  try{report.cleanup=await cleanup(dir,{apply:true});}catch(error:any){report.warnings.push("Archive cleanup skipped: "+error.message);}
  report.status=report.warnings.length?"partial":"ok";
 }catch(error:any){report.status="failed";report.warnings.push(String(error.message).replaceAll(process.env.TINYFISH_API_KEY||"__NO_KEY__","[REDACTED]"));}
 finally {
  report.finished_at=new Date().toISOString();
  try {
   await save();const history=path.join(dir,"daily-runs");await fs.mkdir(history,{recursive:true});await fs.writeFile(path.join(history,report.started_at.replaceAll(":","-")+"-"+report.id+".json"),JSON.stringify(report,null,2).replaceAll(process.env.TINYFISH_API_KEY||"__NO_KEY__","[REDACTED]")+"\n");
   const summary=["# Dernière collecte quotidienne",`Début : ${report.started_at}`,`Fin : ${report.finished_at}`,`État : ${report.status}`,`Nouveaux candidats : ${(report.steps??[]).reduce((n:number,s:Step)=>n+(s.report?.new_items??0),0)}`,`Archives supprimées : ${report.cleanup?.folders.filter((f:any)=>f.status==="deleted").length??0}`,`Archives anciennes protégées : ${report.cleanup?.folders.filter((f:any)=>f.status==="protected").length??0}`,"",...report.warnings.map((w:string)=>"- "+w),"","Détails : daily-last-run.json. Aucun import, aucune publication."];
   await fs.writeFile(path.join(dir,"daily-last-run.md"),summary.join("\n")+"\n");
  }finally{await lock.close();await fs.rm(lockPath,{force:true});}
 }
 return report;
}
export function collectionHealth(report:any,locked:boolean,now=new Date()) {
 if(!report)return {status:"missing",message:"Aucune collecte quotidienne enregistrée"};
 const age=now.getTime()-Date.parse(report.started_at);
 if(!Number.isFinite(age)||age<0)return {status:"invalid",message:"Date de rapport invalide"};
 if(report.status==="running")return {status:locked&&age<8*3600000?"running":"interrupted",message:locked&&age<8*3600000?"Collecte en cours":"Collecte interrompue ou anormalement longue ; vérifier les processus et les verrous"};
 if(age>30*3600000)return {status:"stale",message:"Aucun passage quotidien récent (plus de 30 h)"};
 return {status:report.status,message:report.status==="ok"?"Dernier passage terminé":"Dernier passage incomplet ou en échec ; consulter daily-last-run.md"};
}
