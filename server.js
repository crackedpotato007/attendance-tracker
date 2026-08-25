import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequestListener } from "@react-router/node";
import * as build from "./build/server/index.js";

const PORT = process.env.PORT || 3000;
const clientDir = path.resolve("./build/client");

const listener = createRequestListener({
  build,
  mode: process.env.NODE_ENV || "production",
});

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  // 1. Serve static client assets (JS, CSS, images) directly from build/client
  if (req.url && req.method === "GET") {
    const cleanUrl = req.url.split("?")[0] || "/";
    const filePath = path.join(clientDir, cleanUrl);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
      if (cleanUrl.startsWith("/assets/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // 2. Pass all dynamic pages & API resource routes to React Router SSR
  listener(req, res);
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 BunkPulse Production Server is running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📅 Scheduler: Active (5:00 PM & 11:30 PM Cron)`);
  console.log(`======================================================\n`);
});
