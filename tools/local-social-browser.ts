import {chromium} from "playwright";
import {profile,type FetchPages} from "./social-sources";

// Uses public DOM content only. No stealth patches, hidden endpoints, login automation or challenge bypass.
export async function localBrowserFetcher(storageState?:string){
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({locale:"fr-FR",...(storageState?{storageState}:{})});
 const fetchPages:FetchPages=async urls=>{
  const results:any[]=[],errors:{url:string;error:string}[]=[];
  for(const url of urls){
   const p=profile(url);if(!p){errors.push({url,error:"Unsupported social URL"});continue;}
   const page=await context.newPage();
   try{
    const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:20000});
    if(!response?.ok())throw new Error("Browser HTTP "+response?.status());
    const isPost=/\/status\/|\/(?:p|reel|post|posts|video|videos)\//.test(new URL(url).pathname);
    await page.waitForFunction(()=>document.querySelector('article time, meta[property="article:published_time"], script[type="application/ld+json"]')||/log in|sign in|connexion|access denied|challenge/i.test(document.body.innerText),{},{timeout:8000}).catch(()=>{});
    const links=new Set<string>();
    // Profiles can show pinned/old posts first. Gather several visible sections instead of only the first card.
    for(let i=0;i<(isPost?1:4);i++){
     for(const link of await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLAnchorElement).href)))links.add(link);
     if(!isPost){await page.mouse.wheel(0,1500);await page.waitForTimeout(800);}
    }
    const data=await page.evaluate(({url,isPost})=>{
     const meta=(name:string)=>document.querySelector('meta[property="'+name+'"], meta[name="'+name+'"]')?.getAttribute("content")??null;
     let description=meta("og:description")??meta("description"),author=meta("author"),published_date=meta("article:published_time"),text=description;
     const json:any[]=[];
     const walk=(v:any)=>{if(!v||typeof v!=="object")return;if([].concat(v['@type']??[]).some((t:string)=>['SocialMediaPosting','VideoObject','BlogPosting'].includes(t)))json.push(v);for(const child of Object.values(v))if(child&&typeof child==='object'){if(Array.isArray(child))child.forEach(walk);else walk(child);}};
     for(const el of document.querySelectorAll('script[type="application/ld+json"]'))try{walk(JSON.parse(el.textContent??''));}catch{}
     const entry=json[0];if(entry){description=entry.articleBody??entry.caption??entry.description??description;author=entry.author?.url??entry.author?.['@id']??entry.author?.name??author;published_date=entry.datePublished??entry.uploadDate??published_date;text=description;}
     if(isPost&&/\/(?:status)\//.test(new URL(url).pathname)){
      const id=new URL(url).pathname.split('/')[3];
      const article=[...document.querySelectorAll('article')].find(a=>a.querySelector('a[href*="/status/'+id+'"] time'));
      if(article){text=article.querySelector('[data-testid="tweetText"]')?.textContent??null;description=text;published_date=article.querySelector('time')?.getAttribute('datetime')??null;const href=article.querySelector('[data-testid="User-Name"] a[href]')?.getAttribute('href');author=href?new URL(href,location.origin).href:null;}
     }
     return {url,final_url:location.href,title:document.title,description,author,published_date,text};
    },{url,isPost});
    results.push({...data,links:[...links]});
   }catch(e){errors.push({url,error:e instanceof Error?e.message:String(e)});}finally{await page.close();}
  }
  return {results,errors};
 };
 return {fetchPages,close:()=>browser.close()};
}
