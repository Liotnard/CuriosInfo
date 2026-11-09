import {test} from "node:test";
import assert from "node:assert/strict";
import {inspectBody,discoverFeeds,placeholder,platform} from "../tools/source-check";
test("only parseable RSS and Atom documents qualify as feeds",()=>{
 assert.deepEqual(inspectBody('<rss version="2.0"><channel><title>Source</title><item><title>News</title></item></channel></rss>'),{kind:"rss",feed_title:"Source",entries:1});
 assert.deepEqual(inspectBody('<feed xmlns="http://www.w3.org/2005/Atom"><title>Source</title><entry><title>News</title></entry></feed>'),{kind:"atom",feed_title:"Source",entries:1});
 assert.equal(inspectBody('<rss><channel><item></rss>').kind,"other");
 assert.equal(inspectBody('<!DOCTYPE html><html><head></head><body>News</body></html>').kind,"html");
 assert.equal(inspectBody('<html><body>Access denied, RSS</body></html>').kind,"html");
 assert.equal(inspectBody('<!DOCTYPE rss [<!ENTITY x "value">]><rss/>').kind,"unsupported_xml");
 assert.equal(inspectBody('{"rss":"not a feed"}').kind,"other");
});
test("discovery accepts declared alternate feeds and classifies placeholders and platforms",()=>{
 assert.deepEqual(discoverFeeds(`<link rel="alternate" type="application/rss+xml" href="/feed?a=1&amp;b=2"><link href="/style.css" rel="stylesheet">`,'https://example.org/news'),['https://example.org/feed?a=1&b=2']);
 assert.equal(placeholder('https://example.com/fake/feed'),true);
 assert.equal(placeholder('https://notexample.com'),false);
 assert.equal(platform('https://x.com/account'),true);
 assert.equal(platform('https://www.youtube.com/@handle'),true);
 assert.equal(platform('https://news.example.org/feed'),false);
});

test("an HTTP-success HTML challenge is not an accessible article or feed",()=>{
 assert.equal(inspectBody('<!doctype html><html><head><title>Client Challenge</title></head><body>Please enable JavaScript</body></html>').kind,"access_restricted");
});
