export const SOCKET_SERVER_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4000'
    : window.location.origin;

export const DEFAULT_VIDEO =
  'https://cdn.jsdelivr.net/npm/video-media-samples@1.0.0/big-buck-bunny-480p-30sec.mp4';

export const EMOJI_REACTIONS = ['🍿', '😂', '🔥', '❤️', '😱', '👏'];

export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

export const srtToVttBlobUrl = (srtText) => {
  const vttText =
    'WEBVTT\n\n' +
    srtText.replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2').replace(/\r\n|\r/g, '\n');
  return URL.createObjectURL(new Blob([vttText], { type: 'text/vtt' }));
};

export const pillStyle = {
  background: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 9999,
  display: 'flex',
  alignItems: 'center',
  padding: '4px 6px',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
};

export const appleCircleBtn = (size = 40, active = true) => ({
  width: size,
  height: size,
  minWidth: size,
  minHeight: size,
  borderRadius: '50%',
  background: active ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: active ? '#ffffff' : '#64748b',
  cursor: active ? 'pointer' : 'not-allowed',
  transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease'
});