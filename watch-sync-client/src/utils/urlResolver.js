/**
 * Detects and transforms URLs from Google Drive, Dropbox, and public hosts
 * into direct, streamable media URLs or passes standard platform links (YouTube, Twitch, etc.)
 */
export const resolveMediaSource = (inputUrl) => {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { type: 'unknown', url: '', title: 'Unknown Media' };
  }

  const trimmed = inputUrl.trim();

  // 1. YouTube Detection
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch) {
    return {
      type: 'youtube',
      url: `https://www.youtube.com/watch?v=${ytMatch[1]}`,
      title: 'YouTube Video',
      isPlatform: true
    };
  }

  // 2. Twitch Detection (streams or videos)
  if (trimmed.includes('twitch.tv/')) {
    return {
      type: 'twitch',
      url: trimmed,
      title: 'Twitch Stream',
      isPlatform: true
    };
  }

  // 3. Vimeo Detection
  if (trimmed.includes('vimeo.com/')) {
    return {
      type: 'vimeo',
      url: trimmed,
      title: 'Vimeo Video',
      isPlatform: true
    };
  }

  // 4. Google Drive Transformation
  // Turns /file/d/FILE_ID/view -> direct preview streaming link
  const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return {
      type: 'drive',
      url: `https://drive.google.com/uc?export=download&id=${fileId}`,
      title: `Google Drive (${fileId.slice(0, 6)}...)`,
      isPlatform: false
    };
  }

  // 5. Dropbox Transformation
  // Converts ?dl=0 to ?raw=1 for direct binary stream
  if (trimmed.includes('dropbox.com')) {
    let directUrl = trimmed;
    if (directUrl.includes('?dl=0')) {
      directUrl = directUrl.replace('?dl=0', '?raw=1');
    } else if (directUrl.includes('&dl=0')) {
      directUrl = directUrl.replace('&dl=0', '&raw=1');
    } else if (!directUrl.includes('raw=1')) {
      directUrl += (directUrl.includes('?') ? '&' : '?') + 'raw=1';
    }

    return {
      type: 'dropbox',
      url: directUrl,
      title: 'Dropbox Video',
      isPlatform: false
    };
  }

  // 6. Direct MP4 / HLS / WebM / Media Streams
  return {
    type: trimmed.endsWith('.m3u8') ? 'hls' : 'direct',
    url: trimmed,
    title: trimmed.split('/').pop().split('?')[0] || 'Direct Stream',
    isPlatform: false
  };
};