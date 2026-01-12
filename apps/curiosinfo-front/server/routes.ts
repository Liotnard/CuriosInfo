import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import crypto from 'crypto';
import Parser from 'rss-parser';

// Admin Token middleware
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "secret_admin_token";

const requireAdmin = (req: any, res: any, next: any) => {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === PUBLIC ROUTES ===

  // List Topics
  app.get(api.topics.list.path, async (req, res) => {
    const topics = await storage.getAllTopics();
    res.json(topics);
  });

  // Get Topic Detail
  app.get(api.topics.get.path, async (req, res) => {
    const slug = req.params.slug;
    const topic = await storage.getTopicBySlug(slug);
    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }
    res.json(topic);
  });

  // List Actor
  app.get(api.actor.list.path, async (req, res) => {
    const actorList = await storage.getAllActor();
    res.json(actorList);
  });

  // === ADMIN ROUTES ===

  // Create Topic
  app.post(api.topics.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.topics.create.input.parse(req.body);
      const topic = await storage.createTopic(input);
      res.status(201).json(topic);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Update Topic
  app.patch(api.topics.update.path, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.topics.update.input.parse(req.body);
      const topic = await storage.updateTopic(id, input);
      res.json(topic);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(404).json({ message: "Topic not found" });
    }
  });

  // Delete Topic
  app.delete(api.topics.delete.path, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteTopic(id);
    res.status(204).send();
  });

  // Link Article
  app.post(api.topics.linkArticle.path, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { articleId } = req.body;
    await storage.addArticleToTopic(id, articleId);
    res.status(201).json({ success: true });
  });

  // Unlink Article
  app.delete(api.topics.unlinkArticle.path, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const articleId = parseInt(req.params.articleId);
    await storage.removeArticleFromTopic(id, articleId);
    res.status(204).send();
  });

  // Update Actor Coords
  app.patch(api.actor.update.path, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const input = api.actor.update.input.parse(req.body);
    const updated = await storage.updateActor(id, input);
    res.json(updated);
  });

  // Search Articles
  app.get(api.admin.searchArticles.path, requireAdmin, async (req, res) => {
    const query = req.query.search as string;
    const actorId = req.query.actorId ? parseInt(req.query.actorId as string) : undefined;
    const results = await storage.searchArticles(query, actorId);
    res.json(results);
  });

  // Ingestion
  app.post(api.admin.ingest.path, requireAdmin, async (req, res) => {
    const parser = new Parser();
    const actorList = await storage.getAllActor();
    
    let newArticles = 0;
    let errors = 0;
    const details: string[] = [];

    for (const actor of actorList) {
      try {
        if (!actor.feed_url || actor.feed_url === "TODO") continue;
        
        const feed = await parser.parseURL(actor.feed_url);
        
        for (const item of feed.items) {
          if (!item.link || !item.title || !item.pubDate) continue;
          
          const url = item.link.trim();
          const hash = crypto.createHash('sha256').update(url).digest('hex');
          
          // Check if exists
          const exists = await storage.getArticleByHash(hash);
          if (exists) continue;

          /*await storage.createArticle({
            actorId: actor.id,
            url: url,
            urlHash: hash,
            title: item.title,
            excerpt: item.contentSnippet || item.content || "",
            published_at: new Date(item.pubDate),
          });*/
          newArticles++;
        }
      } catch (e: any) {
        errors++;
        details.push(`Error fetching ${actor.name}: ${e.message}`);
        console.error(`RSS Error for ${actor.name}:`, e);
      }
    }

    res.json({ newArticles, errors, details });
  });

  return httpServer;
}

