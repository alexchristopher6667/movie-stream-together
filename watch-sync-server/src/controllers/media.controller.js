import fs from 'fs';
import path from 'path';
import { CONFIG, ffmpeg } from '../config/server.config.js';
import { roomStore } from '../models/RoomStore.js';
import { extractAudioTrack, extractSubtitleTrack, transcodeToHLS } from '../services/ffmpeg.service.js';

export const checkRoomExists = (req, res) => {
  const room = roomStore.get(req.params.roomId);
  const exists = Boolean(room && room.users.size > 0);
  res.json({ exists });
};

// High-speed direct upload with auto-cleanup (0 CORS restrictions, full byte-range seeking)
export const handleCloudUploadProxy = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  req.setTimeout(0);
  res.setTimeout(0);

  const rawFileName = req.headers['x-file-name'] || `video-${Date.now()}.mp4`;
  const ext = path.extname(decodeURIComponent(rawFileName)) || '.mp4';
  const cleanBaseName = path.basename(decodeURIComponent(rawFileName), ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetFileName = `${Date.now()}-${cleanBaseName}${ext}`;
  const targetFilePath = path.join(CONFIG.MEDIA_DIR, targetFileName);

  const writeStream = fs.createWriteStream(targetFilePath);

  req.pipe(writeStream);

  writeStream.on('finish', () => {
    res.json({
      success: true,
      url: `/media/${targetFileName}`
    });

    // Auto-cleanup: File automatically self-destructs after 2 hours (True Disposable Cloud)
    setTimeout(() => {
      try {
        if (fs.existsSync(targetFilePath)) {
          fs.unlinkSync(targetFilePath);
          console.log(`[Auto-Cleanup] Disposable video purged: ${targetFileName}`);
        }
      } catch {}
    }, 2 * 60 * 60 * 1000);
  });

  writeStream.on('error', (err) => {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  });

  req.on('aborted', () => {
    try {
      writeStream.destroy();
      if (fs.existsSync(targetFilePath)) fs.unlinkSync(targetFilePath);
    } catch {}
  });
};

export const handleMediaUpload = (io) => (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video uploaded' });

  const roomId = req.body.roomId;
  const addToQueueOnly = req.body.addToQueueOnly === 'true';
  const originalTitle = req.body.title || req.file.originalname;
  const inputPath = req.file.path;
  const fileTimestamp = Date.now();
  const hlsOutputDir = path.join(CONFIG.MEDIA_DIR, `hls-${fileTimestamp}`);
  fs.mkdirSync(hlsOutputDir, { recursive: true });

  const masterPlaylistPath = path.join(hlsOutputDir, 'index.m3u8');

  if (roomId && !addToQueueOnly) {
    io.to(roomId).emit('CONVERSION_PROGRESS', { stage: 'analyzing', percent: 10 });
  }

  ffmpeg.ffprobe(inputPath, async (err, metadata) => {
    if (err) {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(hlsOutputDir)) fs.rmSync(hlsOutputDir, { recursive: true, force: true });
      if (roomId && !addToQueueOnly) io.to(roomId).emit('CONVERSION_PROGRESS', { stage: 'error', percent: 0 });
      return res.status(500).json({ error: 'Inspection failed' });
    }

    const audioStreams = metadata.streams.filter((s) => s.codec_type === 'audio');
    const validSubtitleCodecs = ['subrip', 'srt', 'ass', 'ssa', 'mov_text', 'webvtt', 'text'];
    const subtitleStreams = metadata.streams.filter(
      (s) => s.codec_type === 'subtitle' && validSubtitleCodecs.includes(s.codec_name?.toLowerCase())
    );

    if (roomId && !addToQueueOnly) io.to(roomId).emit('CONVERSION_PROGRESS', { stage: 'converting', percent: 25 });

    const [audioResults, subResults] = await Promise.all([
      Promise.all(audioStreams.map((s, idx) => extractAudioTrack(inputPath, s, idx, fileTimestamp))),
      Promise.all(subtitleStreams.map((s, idx) => extractSubtitleTrack(inputPath, s, idx, fileTimestamp)))
    ]);

    const extractedAudioTracks = audioResults.filter(Boolean);
    const extractedSubtitles = subResults.filter(Boolean);
    const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
    const isH264 = videoStream && videoStream.codec_name === 'h264';

    transcodeToHLS({
      inputPath,
      outputDir: hlsOutputDir,
      masterPlaylistPath,
      isH264,
      onProgress: (progress) => {
        const percent = Math.min(99, Math.max(50, Math.round(progress.percent || 50)));
        if (roomId && !addToQueueOnly) io.to(roomId).emit('CONVERSION_PROGRESS', { stage: 'converting', percent });
      },
      onEnd: () => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        const streamUrl = `/media/hls-${fileTimestamp}/index.m3u8`;
        const mediaMeta = { streamUrl, title: originalTitle, isHLS: true, audioTracks: extractedAudioTracks, subtitles: extractedSubtitles };

        const room = roomStore.get(roomId);
        if (room) {
          const generatedFiles = [
            hlsOutputDir,
            ...extractedAudioTracks.map(t => path.join(CONFIG.MEDIA_DIR, path.basename(t.url))),
            ...extractedSubtitles.map(s => path.join(CONFIG.MEDIA_DIR, path.basename(s.url)))
          ];
          room.trackMediaFiles(generatedFiles);

          if (addToQueueOnly) {
            room.queue.push({ id: `queue-${Date.now()}-${Math.random()}`, title: originalTitle, url: streamUrl, mediaMeta });
            io.to(roomId).emit('PLAYLIST_UPDATED', { queue: room.queue, currentQueueIndex: room.currentQueueIndex });
          } else {
            room.videoUrl = streamUrl;
            room.mediaMeta = mediaMeta;
            room.isPlaying = false;
            room.lastTimestamp = 0;
            room.updatedAt = Date.now();
            room.isProcessing = false;
            room.queue = [{ id: `queue-${Date.now()}-${Math.random()}`, title: originalTitle, url: streamUrl, mediaMeta }];
            room.currentQueueIndex = 0;

            io.to(roomId).emit('CONVERSION_PROGRESS', { stage: 'done', percent: 100 });
            io.to(roomId).emit('VIDEO_URL_CHANGED', { newUrl: streamUrl, mediaMeta, queue: room.queue, currentQueueIndex: 0, triggeredBy: 'Room Controller' });
          }
        }
        res.json({ success: true, ...mediaMeta });
      },
      onError: (ffmpegErr) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(hlsOutputDir)) fs.rmSync(hlsOutputDir, { recursive: true, force: true });
        const room = roomStore.get(roomId);
        if (room) {
          room.isProcessing = false;
          io.to(roomId).emit('CONVERSION_PROGRESS', { stage: 'error', percent: 0 });
        }
        res.status(500).json({ error: 'HLS Conversion failed', details: ffmpegErr.message });
      }
    });
  });
};

export const handleMediaStream = (req, res) => {
  const filePath = path.join(CONFIG.MEDIA_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  if (req.params.filename.endsWith('.vtt')) {
    res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'text/vtt; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    return fs.createReadStream(filePath).pipe(res);
  }

  const contentType = req.params.filename.endsWith('.m4a') ? 'audio/mp4' : 'video/mp4';
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(filePath).pipe(res);
  }
};