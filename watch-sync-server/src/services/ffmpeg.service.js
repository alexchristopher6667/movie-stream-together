import fs from 'fs';
import path from 'path';
import { CONFIG, ffmpeg } from '../config/server.config.js';

export const extractAudioTrack = (inputPath, stream, index, fileTimestamp) => {
  return new Promise((resolve) => {
    const audioFileName = `audio-${fileTimestamp}-${index}.m4a`;
    const audioPath = path.join(CONFIG.MEDIA_DIR, audioFileName);
    const trackLabel = stream.tags?.title || stream.tags?.language || `Track ${index + 1}`;
    const lang = stream.tags?.language || 'und';

    const timeout = setTimeout(() => resolve(null), 25000);

    ffmpeg(inputPath)
      .outputOptions([`-map 0:${stream.index}`, '-vn'])
      .audioCodec(stream.codec_name === 'aac' ? 'copy' : 'aac')
      .audioBitrate('192k')
      .save(audioPath)
      .on('end', () => {
        clearTimeout(timeout);
        resolve({ index, label: `${trackLabel.toUpperCase()} (${lang})`, url: `/api/stream/${audioFileName}` });
      })
      .on('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });
  });
};

export const extractSubtitleTrack = (inputPath, stream, index, fileTimestamp) => {
  return new Promise((resolve) => {
    const subFileName = `sub-${fileTimestamp}-${index}.vtt`;
    const subPath = path.join(CONFIG.MEDIA_DIR, subFileName);
    const subLabel = stream.tags?.title || stream.tags?.language || `Subtitle ${index + 1}`;

    const timeout = setTimeout(() => resolve(null), 15000);

    ffmpeg(inputPath)
      .outputOptions([`-map 0:${stream.index}`])
      .toFormat('webvtt')
      .save(subPath)
      .on('end', () => {
        clearTimeout(timeout);
        resolve({ id: `sub-${index}`, label: subLabel, url: `/api/stream/${subFileName}` });
      })
      .on('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });
  });
};

export const transcodeToHLS = ({ inputPath, outputDir, masterPlaylistPath, isH264, onProgress, onEnd, onError }) => {
  let command = ffmpeg(inputPath);
  if (isH264) {
    command.videoCodec('copy');
  } else {
    command.videoCodec('libx264').outputOptions(['-preset ultrafast', '-tune fastdecode', '-crf 22']);
  }

  command
    .audioCodec('aac')
    .audioBitrate('192k')
    .outputOptions([
      '-hls_time 4',
      '-hls_list_size 0',
      '-hls_flags delete_segments+append_list+independent_segments',
      `-hls_segment_filename ${path.join(outputDir, 'segment_%03d.ts')}`
    ])
    .output(masterPlaylistPath)
    .on('progress', onProgress)
    .on('end', onEnd)
    .on('error', onError)
    .run();
};