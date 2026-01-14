import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  // Hypothèse: le front Vite build dans apps/curiosinfo-front/client/dist
  // Ajuste si ton output diffère.
  const distPath = path.resolve(__dirname, "../../curiosinfo-front/client/dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Build front introuvable: ${distPath}. Lance d'abord le build du front.`,
    );
  }

  app.use(express.static(distPath));

  // SPA fallback
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
