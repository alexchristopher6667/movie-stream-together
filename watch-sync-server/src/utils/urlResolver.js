/**
 * Resolves input URLs to direct streamable formats or standard platform players
 */
export const resolveMediaSource = (inputUrl) => {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { type: 'unknown', url: '', title: 'Unknown Media' };
  }

  const trimmed = inputUrl.trim();

  // 1. YouTube
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch) {
    return {
      type: 'youtube',
      url: `https://www.youtube.com/watch?v=${ytMatch[1]}`,
      title: 'YouTube Video'
    };
  }

  // 2. Twitch
  if (trimmed.includes('twitch.tv/')) {
    return {
      type: 'twitch',
      url: trimmed,
      title: 'Twitch Stream'
    };
  }

  // 3. Vimeo
  if (trimmed.includes('vimeo.com/')) {
    return {
      type: 'vimeo',
      url: trimmed,
      title: 'Vimeo Video'
    };
  }

  // 4. Dropbox: Convert to raw binary stream
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
      title: 'Dropbox Media'
    };
  }

  // 5. Google Drive: Direct export endpoint
  const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return {
      type: 'drive',
      url: `https://drive.google.com/uc?export=download&id=${fileId}`,
      title: `Google Drive (${fileId.slice(0, 6)}...)`
    };
  }

  // 6. Direct MP4 / WebM / HLS
  return {
    type: trimmed.endsWith('.m3u8') ? 'hls' : 'direct',
    url: trimmed,
    title: trimmed.split('/').pop().split('?')[0] || 'Direct Stream'
  };
};