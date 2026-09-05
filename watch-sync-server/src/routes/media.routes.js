import { Router } from 'express';
import multer from 'multer';
import { CONFIG } from '../config/server.config.js';
import { checkRoomExists, handleMediaUpload, handleMediaStream } from '../controllers/media.controller.js';

const upload = multer({ dest: CONFIG.UPLOADS_DIR });

export const createMediaRoutes = (io) => {
  const router = Router();
  router.get('/room-check/:roomId', checkRoomExists);
  router.post('/upload', upload.single('video'), handleMediaUpload(io));
  router.get('/stream/:filename', handleMediaStream);
  return router;
};