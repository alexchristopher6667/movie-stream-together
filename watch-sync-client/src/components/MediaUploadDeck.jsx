import React, { useState } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { resolveMediaSource } from '../utils/urlResolver';

export default function MediaUploadDeck({
  hasControlAccess,
  isProcessing,
  inputUrl,
  setInputUrl,
  handleCustomSubtitleFile,
  onPlayResolvedSource = () => {}
}) {
  const [activeTab, setActiveTab] = useState('url'); // 'url' | 'disposable' | 'p2p' | 'vip'
  const [isUploadingTemp, setIsUploadingTemp] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);
  
  // Preserved for Fast Cloud (VIP PIN) to be connected later
  const [vipPin, setVipPin] = useState(() => sessionStorage.getItem('cinema_vip_pin') || '');
  const [isVipUnlocked, setIsVipUnlocked] = useState(() => Boolean(sessionStorage.getItem('cinema_vip_pin')));

  // Tab 1: URL / Platform submit
  const onSubmitDirectUrl = (e, addToQueueOnly = false) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const resolved = resolveMediaSource(inputUrl.trim());
    onPlayResolvedSource(resolved, addToQueueOnly);
    setInputUrl('');
  };

  // Tab 2: Anonymous Disposable Cloud Upload
  // Uses Pixeldrain public API which returns immediate direct streaming URL without landing page
  const handleDisposableUpload = (e, addToQueueOnly = false) => {
    const file = e.target.files[0];
    const inputEl = e.target;
    if (!file) return;

    setIsUploadingTemp(true);
    setUploadPercent(0);
    setUploadStatusText(`Uploading "${file.name}" to temporary cloud...`);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://pixeldrain.com/api/file');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.round((event.loaded / event.total) * 100);
        setUploadPercent(pct);
        setUploadStatusText(`Uploading "${file.name}" (${pct}%)...`);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 201 || xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.id) {
            // Direct streaming media URL
            const directStreamUrl = `https://pixeldrain.com/api/file/${res.id}`;
            const resolved = {
              type: 'direct',
              url: directStreamUrl,
              title: file.name
            };
            onPlayResolvedSource(resolved, addToQueueOnly);
            setUploadStatusText('Upload complete! Video ready to watch.');
          } else {
            throw new Error('No file ID returned');
          }
        } catch {
          setUploadStatusText('Error parsing upload response.');
        }
      } else {
        setUploadStatusText('Upload failed. Try Direct Link or P2P.');
      }
      setIsUploadingTemp(false);
      inputEl.value = '';
      setTimeout(() => setUploadStatusText(''), 3500);
    };

    xhr.onerror = () => {
      setUploadStatusText('Network error during upload.');
      setIsUploadingTemp(false);
      inputEl.value = '';
      setTimeout(() => setUploadStatusText(''), 3500);
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('anonymous', 'True');
    xhr.send(formData);
  };

  // Tab 4: Fast Cloud VIP PIN
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
      {/* 4 Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
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
          <Cloud size={14} /> Disposable Cloud (No Account)
        </button>

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

        <button
          onClick={() => setActiveTab('vip')}
          style={{
            background: activeTab === 'vip' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.05)',
            border: activeTab === 'vip' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
            color: activeTab === 'vip' ? '#38bdf8' : '#94a3b8',
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
          <Lock size={14} /> Fast Cloud (VIP PIN)
        </button>
      </div>

      {/* Tab 1: Direct Link */}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px',
              borderRadius: 14,
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px dashed rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              fontSize: 13,
              fontWeight: 600,
              cursor: isUploadingTemp ? 'wait' : 'pointer'
            }}
          >
            {isUploadingTemp ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            <span>{isUploadingTemp ? uploadStatusText : 'Choose Local Video (Upload to Anonymous Cloud)'}</span>
            <input
              type="file"
              accept="video/*"
              disabled={isUploadingTemp || !hasControlAccess}
              style={{ display: 'none' }}
              onChange={(e) => handleDisposableUpload(e, false)}
            />
          </label>
          {isUploadingTemp && (
            <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{ width: `${uploadPercent}%`, height: '100%', background: '#38bdf8', transition: 'width 0.2s ease' }} />
            </div>
          )}
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Direct anonymous stream via temporary storage. No registration, no server load, streams directly to everyone in room.
          </span>
        </div>
      )}

      {/* Tab 3: Direct P2P */}
      {activeTab === 'p2p' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label
            style={{
              padding: '12px',
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px dashed rgba(255, 255, 255, 0.2)',
              color: '#cbd5e1',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Share2 size={16} color="#38bdf8" />
            <span>Select Local Video to Play Locally (Zero Upload)</span>
            <input
              type="file"
              accept="video/*"
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
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Ideal when both participants have the same movie file on their device: selects the file with 0 MB uploaded to any server, syncing playback timestamps perfectly.
          </span>
        </div>
      )}

      {/* Tab 4: Fast Cloud (VIP PIN) Preserved */}
      {activeTab === 'vip' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                  padding: '10px 14px',
                  borderRadius: 14,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '10px 16px',
                  borderRadius: 14,
                  border: 'none',
                  background: '#38bdf8',
                  color: '#030712',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Key size={14} /> Unlock
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                  <CheckCircle2 size={15} /> VIP Fast Cloud Unlocked
                </span>
                <button
                  onClick={() => {
                    sessionStorage.removeItem('cinema_vip_pin');
                    setIsVipUnlocked(false);
                    setVipPin('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Lock
                </button>
              </div>
              <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 12 }}>
                Cloudflare R2 backend endpoint will be connected in next phase. Please use Direct Link or Disposable Cloud for now.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}