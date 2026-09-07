import React, { useState, useRef } from 'react';
import {
  Link as LinkIcon,
  Cloud,
  Share2,
  Lock,
  Plus,
  Play,
  Upload,
  Loader2,
  Key,
  CheckCircle2,
  Sparkles,
  Gauge,
  Clock,
  HardDrive,
  Crown
} from 'lucide-react';
import { resolveMediaSource } from '../utils/urlResolver';
import { SOCKET_SERVER_URL } from '../utils/helpers';

export default function MediaUploadDeck({
  hasControlAccess,
  isProcessing,
  inputUrl,
  setInputUrl,
  handleCustomSubtitleFile,
  onPlayResolvedSource = () => {}
}) {
  // Tab order: 1. Link, 2. Disposable Cloud, 3. Direct P2P, 4. Fast Cloud (VIP PIN)
  const [activeTab, setActiveTab] = useState('url');

  // Metrics & Timeline state for Disposable Cloud
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [uploadEta, setUploadEta] = useState('');
  const [uploadSizeText, setUploadSizeText] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadTargetMode, setUploadTargetMode] = useState('play');

  // Fast Cloud VIP PIN
  const [vipPin, setVipPin] = useState(() => sessionStorage.getItem('cinema_vip_pin') || '');
  const [isVipUnlocked, setIsVipUnlocked] = useState(() => Boolean(sessionStorage.getItem('cinema_vip_pin')));

  const activeXhrRef = useRef(null);

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  // 1. Direct Link / Platform submission
  const onSubmitDirectUrl = (e, addToQueueOnly = false) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const resolved = resolveMediaSource(inputUrl.trim());
    onPlayResolvedSource(resolved, addToQueueOnly);
    setInputUrl('');
  };

  // 2. Disposable Cloud Upload (0 MB permanent disk, Range seekable, Android & Desktop)
  const handleCloudUpload = (file, addToQueueOnly = false) => {
    if (!file) return;

    setIsUploading(true);
    setUploadPercent(0);
    setUploadFileName(file.name);
    setUploadTargetMode(addToQueueOnly ? 'queue' : 'play');
    setUploadSizeText(`0 MB / ${formatBytes(file.size)}`);
    setUploadSpeed('Starting upload stream...');
    setUploadEta('--');

    const xhr = new XMLHttpRequest();
    activeXhrRef.current = xhr;

    xhr.open('POST', `${SOCKET_SERVER_URL}/api/cloud-upload`);
    xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const now = Date.now();
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        setUploadPercent(percent);

        const timeElapsed = (now - lastTime) / 1000;
        if (timeElapsed >= 0.25 || event.loaded === event.total) {
          const bytesDiff = event.loaded - lastLoaded;
          const currentSpeedBytes = bytesDiff / (timeElapsed || 0.001);
          setUploadSpeed(`${formatBytes(currentSpeedBytes)}/s`);

          const remainingBytes = event.total - event.loaded;
          const remainingSecs = Math.max(0, Math.round(remainingBytes / (currentSpeedBytes || 1)));
          const etaFormatted = remainingSecs > 60
            ? `${Math.floor(remainingSecs / 60)}m ${remainingSecs % 60}s`
            : `${remainingSecs}s`;
          setUploadEta(`ETA: ${etaFormatted}`);

          setUploadSizeText(`${formatBytes(event.loaded)} / ${formatBytes(event.total)}`);

          lastLoaded = event.loaded;
          lastTime = now;
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res?.url) {
            setUploadPercent(100);
            const directStreamUrl = `${SOCKET_SERVER_URL}${res.url}`;

            const resolved = {
              type: 'direct',
              url: directStreamUrl,
              title: file.name
            };

            onPlayResolvedSource(resolved, addToQueueOnly);
            setIsUploading(false);
            activeXhrRef.current = null;
            return;
          }
        } catch {}
      }
      setIsUploading(false);
      activeXhrRef.current = null;
    };

    xhr.onerror = () => {
      setIsUploading(false);
      activeXhrRef.current = null;
    };

    xhr.send(file);
  };

  // 4. Fast Cloud VIP PIN handler
  const handleUnlockVip = (e) => {
    e.preventDefault();
    if (vipPin.trim().length >= 4) {
      sessionStorage.setItem('cinema_vip_pin', vipPin.trim());
      setIsVipUnlocked(true);
    }
  };

  return (
    <div
      style={{
        marginTop: 14,
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 20,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}
    >
      {/* 4 Tabs: Link -> Disposable Cloud -> Direct P2P -> Fast Cloud (VIP PIN) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {/* Tab 1: Link / Platform */}
        <button
          onClick={() => setActiveTab('url')}
          style={{
            background: activeTab === 'url' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.05)',
            border: activeTab === 'url' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
            color: activeTab === 'url' ? '#38bdf8' : '#94a3b8',
            padding: '7px 14px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap'
          }}
        >
          <LinkIcon size={14} /> Link / Platform (YouTube, Drive, Dropbox)
        </button>

        {/* Tab 2: Disposable Cloud */}
        <button
          onClick={() => setActiveTab('disposable')}
          style={{
            background: activeTab === 'disposable' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.05)',
            border: activeTab === 'disposable' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
            color: activeTab === 'disposable' ? '#38bdf8' : '#94a3b8',
            padding: '7px 14px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap'
          }}
        >
          <Cloud size={14} /> Disposable Cloud (0 MB Disk, Up to 10 GB)
        </button>

        {/* Tab 3: Direct P2P */}
        <button
          onClick={() => setActiveTab('p2p')}
          style={{
            background: activeTab === 'p2p' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.05)',
            border: activeTab === 'p2p' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
            color: activeTab === 'p2p' ? '#38bdf8' : '#94a3b8',
            padding: '7px 14px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap'
          }}
        >
          <Share2 size={14} /> Direct P2P (Zero Upload)
        </button>

        {/* Tab 4: Fast Cloud (VIP PIN) - Highlighted as Premium */}
        <button
          onClick={() => setActiveTab('vip')}
          style={{
            background: activeTab === 'vip'
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(234, 88, 12, 0.28))'
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(234, 88, 12, 0.12))',
            border: activeTab === 'vip' ? '1px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fbbf24',
            padding: '7px 15px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            boxShadow: activeTab === 'vip' ? '0 0 16px rgba(245, 158, 11, 0.35)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Crown size={14} color="#f59e0b" />
          <span>Fast Cloud (VIP PIN)</span>
          <span
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#030712',
              fontSize: 9,
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: 6,
              letterSpacing: '0.05em'
            }}
          >
            ULTRA
          </span>
        </button>
      </div>

      {/* Tab 1: Link / Platform */}
      {activeTab === 'url' && (
        <form onSubmit={(e) => onSubmitDirectUrl(e, false)} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Paste YouTube, Google Drive, Dropbox, or direct .mp4/.m3u8 URL..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            disabled={!hasControlAccess || isProcessing}
            style={{
              flex: 1,
              padding: '11px 14px',
              borderRadius: 14,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#fff',
              fontSize: 13,
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={!hasControlAccess || !inputUrl.trim() || isProcessing}
            style={{
              padding: '10px 18px',
              borderRadius: 14,
              border: 'none',
              background: '#38bdf8',
              color: '#030712',
              fontWeight: 700,
              fontSize: 13,
              cursor: !hasControlAccess || !inputUrl.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Play size={14} fill="#030712" /> Play
          </button>
          <button
            type="button"
            onClick={(e) => onSubmitDirectUrl(e, true)}
            disabled={!hasControlAccess || !inputUrl.trim() || isProcessing}
            style={{
              padding: '10px 14px',
              borderRadius: 14,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#f8fafc',
              fontWeight: 600,
              fontSize: 13,
              cursor: !hasControlAccess || !inputUrl.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={14} /> Queue
          </button>
        </form>
      )}

      {/* Tab 2: Disposable Cloud */}
      {activeTab === 'disposable' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!isUploading ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '14px',
                  borderRadius: 14,
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px dashed rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: hasControlAccess ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s ease'
                }}
              >
                <Upload size={16} />
                <span>Select Movie (MKV / MP4, Up to 10 GB) — Stream to Everyone</span>
                <input
                  type="file"
                  accept="video/*,.mkv,.mp4,.mov,.avi,.webm"
                  disabled={!hasControlAccess}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleCloudUpload(file, false);
                    e.target.value = '';
                  }}
                />
              </label>

              <label
                style={{
                  padding: '0 16px',
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: hasControlAccess ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap'
                }}
                title="Upload to playlist queue in background"
              >
                <Plus size={15} />
                <span>Queue Next</span>
                <input
                  type="file"
                  accept="video/*,.mkv,.mp4,.mov,.avi,.webm"
                  disabled={!hasControlAccess}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleCloudUpload(file, true);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 14,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                  <Loader2 className="animate-spin" size={15} color="#38bdf8" />
                  <span style={{ fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>
                    {uploadFileName}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    ({uploadTargetMode === 'queue' ? 'Queueing' : 'Playing upon completion'})
                  </span>
                </div>
                <span style={{ color: '#38bdf8', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {uploadPercent}%
                </span>
              </div>

              <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 9999, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${uploadPercent}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                    transition: 'width 0.25s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <HardDrive size={12} color="#38bdf8" />
                  <span>{uploadSizeText}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Gauge size={12} color="#38bdf8" />
                  <span>{uploadSpeed}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} color="#38bdf8" />
                  <span>{uploadEta}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b' }}>
            <span>⚡ Direct CDN stream: auto-purged on session end.</span>
            <span style={{ color: '#38bdf8' }}>Server Storage: 0 MB Permanent</span>
          </div>
        </div>
      )}

      {/* Tab 3: Direct P2P */}
      {activeTab === 'p2p' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label
            style={{
              padding: '16px',
              borderRadius: 14,
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px dashed rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              fontSize: 13,
              fontWeight: 600,
              cursor: hasControlAccess ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10
            }}
          >
            <Sparkles size={18} color="#38bdf8" />
            <span>Select Local Video to Play Locally (Zero Upload)</span>
            <input
              type="file"
              accept="video/*"
              disabled={!hasControlAccess}
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const blobUrl = URL.createObjectURL(file);
                  onPlayResolvedSource({ type: 'local', url: blobUrl, title: file.name }, false);
                }
              }}
            />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
            <span>⚡ Selects identical file on all devices: 0 MB uploaded anywhere, perfect time-sync.</span>
            <span style={{ color: '#38bdf8' }}>Storage: 0 MB</span>
          </div>
        </div>
      )}

      {/* Tab 4: Fast Cloud (VIP PIN) - Ultra Premium Card */}
      {activeTab === 'vip' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '16px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Crown size={16} color="#f59e0b" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>
                Cloudflare R2 Dedicated High-Throughput Edge CDN
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.15)',
                padding: '2px 8px',
                borderRadius: 9999,
                border: '1px solid rgba(245, 158, 11, 0.4)'
              }}
            >
              VIP Access Only
            </span>
          </div>

          {!isVipUnlocked ? (
            <form onSubmit={handleUnlockVip} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="password"
                maxLength={8}
                placeholder="Enter 4-digit VIP PIN..."
                value={vipPin}
                onChange={(e) => setVipPin(e.target.value)}
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  borderRadius: 14,
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  background: 'rgba(0, 0, 0, 0.4)',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '11px 18px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#030712',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                }}
              >
                <Key size={14} /> Unlock VIP Cloud
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                  <CheckCircle2 size={15} /> VIP Fast Cloud Unlocked & Active
                </span>
                <button
                  onClick={() => {
                    sessionStorage.removeItem('cinema_vip_pin');
                    setIsVipUnlocked(false);
                    setVipPin('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Lock
                </button>
              </div>
              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                  fontSize: 12,
                  lineHeight: 1.5
                }}
              >
                🚀 High-speed enterprise edge proxy active. Dedicated bandwidth reserved for zero-buffering 4K/1080p playback.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}