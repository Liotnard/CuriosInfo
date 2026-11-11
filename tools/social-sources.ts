import {createHash} from "node:crypto";
import {z} from "zod";
import {CandidateSchema,canonicalUrl,type Candidate} from "./collection";

export type SocialSource={actorId:number;actor_name:string;platform:string;account:string;url:string;references:string[];channelId?:string;ambiguous?:boolean;scope_review?:boolean};
export const PageSchema=z.object({url:z.string().url(),final_url:z.string().url().optional(),title:z.string().nullable().optional(),description:z.string().nullable().optional(),author:z.string().nullable().optional(),published_date:z.string().nullable().optional(),text:z.unknown().optional(),links:z.array(z.string()).default([])});
export type Page=z.infer<typeof PageSchema>;
export type FetchPages=(urls:string[])=>Promise<{results:Page[];errors:{url:string;error:string}[]}>;
const norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const host=(u:URL)=>u.hostname.toLowerCase().replace(/^(www|m)\./,"");
const clean=(s:string)=>s.replace(/\s+/g," ").trim();
const supported:Record<string,string>={"x.com":"x","twitter.com":"x","instagram.com":"instagram","facebook.com":"facebook","tiktok.com":"tiktok","threads.com":"threads","threads.net":"threads","youtube.com":"youtube","twitch.tv":"twitch","t.me":"telegram","bsky.app":"bluesky"};
export function profile(value:string):Omit<SocialSource,"actorId"|"actor_name"|"references">|null {
 try {
  const u=new URL(value);if(!/^https?:$/.test(u.protocol)||u.username||u.password||u.port)return null;
  const h=host(u),platform=supported[h];if(!platform)return null;
  const parts=decodeURIComponent(u.pathname).split("/").filter(Boolean);let account:string|undefined=parts[0];
  if(platform==="youtube"){
   const channelId=parts[0]==="channel"&&/^UC[\w-]{22}$/.test(parts[1]??"")?parts[1]:undefined;
   if(channelId)return {platform,account:channelId,url:"https://www.youtube.com/channel/"+channelId,channelId};
   if(parts[0]==="c"||parts[0]==="user")account=parts[1];
   if(!account||["watch","playlist","shorts","feed","results"].includes(account))return null;
   return {platform,account,url:"https://www.youtube.com/"+(parts[0]==="c"||parts[0]==="user"?parts[0]+"/":"")+account};
  }
  if(platform==="bluesky")account=parts[0]==="profile"?parts[1]:undefined;
  if(!account||/^(i|home|search|explore|intent|share|sharer.php|accounts|login|p|reel|reels|watch|groups|pages|hashtag|stories|following|directory)$/i.test(account))return null;
  if(platform==="x"&&!/^[a-z0-9_]{1,15}$/i.test(account))return null;
  const base=platform==="x"?"https://x.com/":platform==="bluesky"?"https://bsky.app/profile/":"https://"+h+"/";
  return {platform,account,url:base+account};
 }catch{return null;}
}
// All original URLs remain in actors/mapactors. Duplicate profile sections are one monitoring target.
export function buildSocialSources(actors:any[],maps:any[]):SocialSource[]{
 const result:SocialSource[]=[];
 for(const actor of actors){
  const urls=[actor.feed_url,actor.website_url,...(actor.additional_urls??[]),...(maps.find(m=>m.id===actor.id)?.urls??[])].filter((x):x is string=>typeof x==="string");
  const local=new Map<string,SocialSource>();
  for(const url of urls){const p=profile(url);if(!p)continue;const key=p.platform+":"+p.account.toLowerCase();const existing=local.get(key);if(existing)existing.references.push(url);else local.set(key,{...p,actorId:actor.id,actor_name:actor.name,references:[url]});}
  // An explicit YouTube channel ID avoids resolving aliases for that same actor on every run.
  const hasChannel=[...local.values()].some(s=>s.channelId);
  const first=new Map<string,string>();for(const s of local.values()){if(!first.has(s.platform))first.set(s.platform,s.account.toLowerCase());else if(s.platform!=="youtube"&&first.get(s.platform)!==s.account.toLowerCase())s.scope_review=true;}
  for(const source of local.values())if(!(source.platform==="youtube"&&hasChannel&&!source.channelId))result.push(source);
 }
 const owners=new Map<string,Set<number>>();
 for(const s of result){const k=s.platform+":"+s.account.toLowerCase();const ids=owners.get(k)??new Set();ids.add(s.actorId);owners.set(k,ids);}
 for(const s of result)s.ambiguous=owners.get(s.platform+":"+s.account.toLowerCase())!.size>1;
 return result;
}
export function ownPostLinks(source:SocialSource,page:Page):string[]{
 const found=new Set<string>();
 for(const link of page.links){try{
  const u=new URL(link);if(!/^https?:$/.test(u.protocol)||u.username||u.password||u.port)continue;const p=decodeURIComponent(u.pathname).split("/").filter(Boolean);let ok=false;
  if(source.platform==="x")ok=["x.com","twitter.com"].includes(host(u))&&p.length===3&&p[0].toLowerCase()===source.account.toLowerCase()&&p[1]==="status"&&/^\d+$/.test(p[2]);
  if(source.platform==="instagram")ok=host(u)==="instagram.com"&&((p.length===3&&p[0].toLowerCase()===source.account.toLowerCase()&&["p","reel"].includes(p[1]))||(p.length===2&&["p","reel"].includes(p[0])));
  if(source.platform==="tiktok")ok=host(u)==="tiktok.com"&&p.length===3&&p[0].toLowerCase()===source.account.toLowerCase()&&p[1]==="video";
  if(source.platform==="threads")ok=["threads.com","threads.net"].includes(host(u))&&p.length===3&&p[0].toLowerCase()===source.account.toLowerCase()&&p[1]==="post";
  if(source.platform==="facebook")ok=host(u)==="facebook.com"&&p[0]?.toLowerCase()===source.account.toLowerCase()&&["posts","videos"].includes(p[1]);
  if(source.platform==="telegram")ok=host(u)==="t.me"&&p.length===2&&p[0].toLowerCase()===source.account.toLowerCase()&&/^\d+$/.test(p[1]);
  if(source.platform==="bluesky")ok=host(u)==="bsky.app"&&p.length===4&&p[0]==="profile"&&p[1].toLowerCase()===source.account.toLowerCase()&&p[2]==="post";
  if(source.platform==="twitch")ok=host(u)==="twitch.tv"&&((p.length===2&&p[0]==="videos"&&/^\d+$/.test(p[1]))||(p.length===3&&p[0].toLowerCase()===source.account.toLowerCase()&&p[1]==="clip"));
  if(source.platform==="youtube")ok=host(u)==="youtube.com"&&u.pathname==="/watch"&&!!u.searchParams.get("v");
  if(ok){u.search="";if(source.platform==="youtube")u.search=new URL(link).search;u.hash="";found.add(u.href.replace(/\/$/,""));}
 }catch{}}
 return [...found];
}
function treeText(value:unknown):string{
 if(typeof value==="string")return value;
 if(!value||typeof value!=="object")return "";
 const v=value as {type?:string;level?:number;text?:unknown;children?:unknown[]};
 // JSON tree from Fetch: heading level 1 is the original post, not the replies or profile biography.
 if(v.type==="heading"&&v.level===1&&typeof v.text==="string")return v.text;
 if(v.children)return v.children.map(treeText).filter(Boolean).join("\n");return "";
}
export function candidateFromPage(source:SocialSource,page:Page,now:Date):Candidate{
 if(source.ambiguous||source.scope_review)throw new Error("Account assigned to multiple actors; ownership review required");
 const pageUrl=page.final_url??page.url;
 const owned=ownPostLinks(source,{...page,links:[pageUrl]});if(!owned.length)throw new Error("Page is not an original post belonging to the requested account");
 let authorVerified=false;
 if(page.author){const a=profile(page.author);authorVerified=!!a&&a.platform===source.platform&&a.account.toLowerCase()===source.account.toLowerCase();
  if(!authorVerified&&norm(page.author).replace(/[^a-z0-9]/g,"")===norm(source.actor_name).replace(/[^a-z0-9]/g,""))authorVerified=true;}
 if(!authorVerified)throw new Error("Missing or mismatched original author; cannot attribute post");
 const date=page.published_date&&new Date(page.published_date);if(!date||!Number.isFinite(date.getTime())||date>now)throw new Error("Missing, invalid or future publication date");
 let body=clean(treeText(page.text)||page.description||"");
 if(!body||/^(?:log in|sign in|just a moment|client challenge|access denied)/i.test(body))throw new Error("Original post content is unavailable");
 // Do not absorb unrelated conversation replies from a Markdown page when a dedicated description exists.
 if(typeof page.text==="string"&&page.description)body=clean(page.description);
 const url=canonicalUrl(owned[0]);const hash=createHash("sha256").update(url).digest("hex");
 return CandidateSchema.parse({key:hash,urlHash:hash,actorId:source.actorId,actor_name:source.actor_name,feed_url:null,origin:"social_public_page",url,title:source.actor_name+" — publication "+source.platform+" du "+date.toISOString().slice(0,10),excerpt:body.slice(0,1000),published_at:date.toISOString(),date_basis:"published",discovered_at:now.toISOString(),status:"pending",source_profile:source.url,source_platform:source.platform,content_kind:"post",evidence_checked_at:now.toISOString()});
}
export function matchesTerms(value:string,terms:string[]):boolean{return !terms.length||terms.some(term=>norm(value).includes(norm(term)));}

export function tinyfishFetcher(key:string,request:typeof fetch=fetch):FetchPages{
 if(!key.trim())throw new Error("TINYFISH_API_KEY is required for autonomous browser fetching");
 return async urls=>{
  if(!urls.length||urls.length>10)throw new Error("Fetch batch must contain 1 to 10 URLs");
  const r=await request("https://api.fetch.tinyfish.ai",{method:"POST",redirect:"error",signal:AbortSignal.timeout(30000),headers:{"Content-Type":"application/json","X-API-Key":key},body:JSON.stringify({urls,format:"json",links:true,ttl:300,per_url_timeout_ms:20000})});
  if(!r.ok){await r.body?.cancel();throw new Error("Browser provider HTTP "+r.status);}
  const data=await r.json() as any;
  return {results:z.array(PageSchema).parse(data.results??[]),errors:(data.errors??[]).map((x:any)=>({url:String(x.url),error:String(x.error)}))};
 };
}
