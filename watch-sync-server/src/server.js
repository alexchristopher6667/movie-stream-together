import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { CONFIG } from './config/server.config.js';
import { createMediaRoutes } from './routes/media.routes.js';
import { initSocketManager } from './socket/socketManager.js';

// Ensure storage directories exist
if (!fs.existsSync(CONFIG.UPLOADS_DIR)) fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(CONFIG.MEDIA_DIR)) fs.mkdirSync(CONFIG.MEDIA_DIR, { recursive: true });

// Background Garbage Collector: Deletes orphaned files older than 2 hours
const runOrphanedMediaCleanup = () => {
  const maxAgeMs = 2 * 60 * 60 * 1000;
  const now = Date.now();

  [CONFIG.UPLOADS_DIR, CONFIG.MEDIA_DIR].forEach((dir) => {
    fs.readdir(dir, (err, files) => {
      if (err || !files) return;
      files.forEach((file) => {
        // Skip persistent demo files
        if (file === 'hls-demo' || file.startsWith('.')) return;

        const fullPath = path.join(dir, file);
        fs.stat(fullPath, (statErr, stats) => {
          if (statErr) return;
          if (now - stats.mtimeMs > maxAgeMs) {
            if (stats.isDirectory()) {
              fs.rm(fullPath, { recursive: true, force: true }, () => {});
            } else {
              fs.unlink(fullPath, () => {});
            }
          }
        });
      });
    });
  });
};

// Run garbage collector every 30 minutes
setInterval(runOrphanedMediaCleanup, 30 * 60 * 1000);

const app = express();
app.use(cors({ origin: CONFIG.CORS_ORIGIN }));

// Serve static HLS manifests & video chunks
app.use('/media', express.static(CONFIG.MEDIA_DIR, {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (filePath.endsWith('.m3u8')) res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    else if (filePath.endsWith('.ts')) res.setHeader('Content-Type', 'video/mp2t');
  }
}));

const httpServer = createServer(app);
const io = initSocketManager(httpServer);

// Lightweight healthcheck endpoint for keep-alive pings
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Register API Routes
app.use('/api', createMediaRoutes(io));

httpServer.listen(CONFIG.PORT, () => {
  console.log(`🚀 Production Watch-Sync Server running on http://localhost:${CONFIG.PORT}`);
});