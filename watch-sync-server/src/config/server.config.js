import path from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  PORT: process.env.PORT || 4000,
  UPLOADS_DIR: path.join(__dirname, '../../uploads'),
  MEDIA_DIR: path.join(__dirname, '../../media'),
  DEFAULT_VIDEO: 'https://cdn.jsdelivr.net/npm/video-media-samples@1.0.0/big-buck-bunny-480p-30sec.mp4',
  HEARTBEAT_INTERVAL_MS: 1500,
  CORS_ORIGIN: '*'
};

export { ffmpeg };