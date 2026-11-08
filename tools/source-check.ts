import { XMLParser, XMLValidator } from "fast-xml-parser";
export type Check = { url:string; final_url?:string; kind:string; http_status?:number; content_type?:string; feed_title?:string; entries?:number; error?:string };
export function placeholder(value:string) { try { const h=new URL(value).hostname; return h === "example.com" || h.endsWith(".example.com"); } catch { return false; } }
export function platform(value:string) { try { return /(^|\.)(x\.com|twitter\.com|instagram\.com|twitch\.tv|facebook\.com|tiktok\.com|youtube\.com|youtu\.be)$/.test(new URL(value).hostname); } catch { return false; } }
export function inspectBody(text:string):Pick<Check,"kind"|"feed_title"|"entries"> {
  if (/^\s*(?:<\?xml[^>]*>\s*)?(?:<!doctype html\b|<html\b|<head\b|<body\b)/i.test(text)) return {kind: /<title>\s*(just a moment|access denied)|cf-chl-/i.test(text)?"access_restricted":"html"};
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) return {kind:"unsupported_xml"};
  if (XMLValidator.validate(text) === true) {
    try {
      const parsed=new XMLParser({ignoreAttributes:false,processEntities:false,removeNSPrefix:true}).parse(text);
      const channel=parsed.rss?.channel;
      const list=(value:any)=>value==null?[]:Array.isArray(value)?value:[value];
      if (channel && typeof channel === "object") return {kind:"rss",feed_title:String(channel.title ?? ""),entries:list(channel.item).length};
      if (parsed.feed && typeof parsed.feed === "object") return {kind:"atom",feed_title:String(parsed.feed.title?.["#text"] ?? parsed.feed.title ?? ""),entries:list(parsed.feed.entry).length};
      if (parsed.RDF?.item) return {kind:"rss",feed_title:String(parsed.RDF.channel?.title ?? ""),entries:list(parsed.RDF.item).length};
    } catch { return {kind:"invalid_xml"}; }
  }
  return {kind:/^\s*(?:<\?xml[^>]*>\s*)?(?:<!doctype html\b|<html\b|<head\b|<body\b)/i.test(text)?"html":"other"};
}
export function discoverFeeds(html:string,base:string):string[] {
  const result:string[]=[];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs:Record<string,string>={};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)) attrs[match[1].toLowerCase()]=match[2];
    if (!/alternate/i.test(attrs.rel ?? "") || !/(rss|atom)\+xml/i.test(attrs.type ?? "") || !attrs.href) continue;
    try { const url=new URL(attrs.href.replaceAll("&amp;","&"),base); if (/^https?:$/.test(url.protocol)) result.push(url.href); } catch {}
  }
  return [...new Set(result)];
}
export async function probe(url:string):Promise<{check:Check;discovered:string[]}> {
  const check:Check={url,kind:"unreachable"};
  try {
    const parsed=new URL(url);
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(parsed.hostname)) throw new Error("Unsupported URL");
    const response=await fetch(url,{signal:AbortSignal.timeout(8000),headers:{"User-Agent":"CuriosInfo-SourceAudit/1.0 (RSS discovery)","Accept":"application/rss+xml, application/atom+xml, application/xml, text/html;q=0.8"}});
    check.http_status=response.status;check.final_url=response.url;check.content_type=response.headers.get("content-type") ?? "";
    if (!response.ok) { check.kind=[401,403,429].includes(response.status)?"access_restricted":"http_error";await response.body?.cancel();return {check,discovered:[]}; }
    const reader=response.body!.getReader();let size=0;const chunks:Uint8Array[]=[];
    for (;;) { const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000){await reader.cancel();throw new Error("Response exceeds 2 MB");}chunks.push(value); }
    const text=Buffer.concat(chunks).toString("utf8");
    Object.assign(check,inspectBody(text));
    return {check,discovered:check.kind === "html"?discoverFeeds(text,response.url):[]};
  } catch (error) { check.error=error instanceof Error?error.message:String(error);return {check,discovered:[]}; }
}
