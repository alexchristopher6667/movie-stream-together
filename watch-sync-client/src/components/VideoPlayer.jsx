import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Settings,
  BookmarkPlus,
  Loader2,
  Check,
  ChevronRight,
  ArrowLeft,
  Mic,
  MicOff,
  MessageSquare,
  X,
  Send,
  Subtitles,
  UploadCloud,
  Gauge,
  Tv
} from 'lucide-react';
import { formatTime, EMOJI_REACTIONS } from '../utils/helpers';

export default function VideoPlayer({
  videoRef,
  videoUrl,
  playerContainerRef,
  isPlaying,
  currentTime,
  duration,
  userVolume,
  isMuted,
  isFullscreen,
  isPiP,
  showControls,
  playbackSpeed,
  currentMediaTitle,
  hasControlAccess,
  isProcessing,
  processState,
  bufferStatus,
  activeReactions = [],
  settingsView,
  setSettingsView,
  availableAudioTracks = [],
  selectedAudioTrackIndex = 0,
  availableSubtitles = [],
  selectedSubtitleId = 'off',
  currentAudioLabel = 'Default',
  currentSubLabel = 'Off',
  handleAudioTrackChange = () => {},
  handleSubtitleChange = () => {},
  handleCustomSubtitleFile = () => {},
  queue = [],
  currentQueueIndex = 0,
  togglePlay,
  skipSeconds,
  toggleMute,
  toggleFullscreen,
  togglePiP,
  playNextVideo,
  createBookmarkAtCurrentTime,
  handleSeekStart,
  handleSeekChange,
  handleSeekEnd,
  handleVolumeChange,
  setPlaybackSpeed,
  handleNativePlay,
  handleNativePause,
  handleNativeSeeked,
  handleVideoEnded,
  bufferDebounceTimer,
  socketRef,
  setCurrentTime = () => {},
  setDuration = () => {},
  setIsPlaying = () => {},
  isMicMuted,
  toggleMic,
  speakingPeers = new Set(),
  roomParticipants = [],
  currentUsername = '',
  currentSocketId = null,
  messages = [],
  unreadCount = 0,
  onResetUnread = () => {},
  onSendMessage = () => {},
  onSendReaction = () => {},
  engineRef
}) {
  const [isFullscreenChatOpen, setIsFullscreenChatOpen] = useState(false);
  const [fullscreenChatInput, setFullscreenChatInput] = useState('');

  const ytPlayerRef = useRef(null);
  const ytIntervalRef = useRef(null);
  const isInternalYT = useRef(false);
  const isYtReady = useRef(false);
  const isLocalDragging = useRef(false);

  // YouTube Specific Captions State
  const [ytCaptions, setYtCaptions] = useState([]);
  const [currentYtCaption, setCurrentYtCaption] = useState('off');

  const hasControlAccessRef = useRef(hasControlAccess);
  hasControlAccessRef.current = hasControlAccess;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const userVolumeRef = useRef(userVolume);
  userVolumeRef.current = userVolume;

  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const isYouTube = Boolean(videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')));

  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const ytVideoId = isYouTube ? getYouTubeId(videoUrl) : null;

  // Unload and stop background media when switching sources
  useEffect(() => {
    if (isYouTube) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    } else {
      if (ytPlayerRef.current && isYtReady.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
    }
  }, [isYouTube, videoUrl]);

  // Unified engine controller exposed to Room.jsx
  useEffect(() => {
    if (!engineRef) return;
    engineRef.current = {
      isYouTube,
      play: () => {
        if (isYouTube && ytPlayerRef.current?.playVideo && isYtReady.current) {
          isInternalYT.current = true;
          ytPlayerRef.current.playVideo();
          setTimeout(() => { isInternalYT.current = false; }, 400);
        } else if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      },
      pause: () => {
        if (isYouTube && ytPlayerRef.current?.pauseVideo && isYtReady.current) {
          isInternalYT.current = true;
          ytPlayerRef.current.pauseVideo();
          setTimeout(() => { isInternalYT.current = false; }, 400);
        } else if (videoRef.current) {
          videoRef.current.pause();
        }
      },
      seek: (time) => {
        if (isYouTube && ytPlayerRef.current?.seekTo && isYtReady.current) {
          isInternalYT.current = true;
          ytPlayerRef.current.seekTo(time, true);
          setTimeout(() => { isInternalYT.current = false; }, 600);
        } else if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      setSpeed: (speed) => {
        if (isYouTube && ytPlayerRef.current?.setPlaybackRate && isYtReady.current) {
          ytPlayerRef.current.setPlaybackRate(speed);
        } else if (videoRef.current) {
          videoRef.current.playbackRate = speed;
        }
      },
      getCurrentTime: () => {
        if (isYouTube && ytPlayerRef.current?.getCurrentTime && isYtReady.current) {
          return ytPlayerRef.current.getCurrentTime() || 0;
        }
        return videoRef.current?.currentTime || 0;
      }
    };
  }, [isYouTube, engineRef, videoRef]);

  // YouTube Player Loader
  useEffect(() => {
    if (!isYouTube || !ytVideoId) {
      isYtReady.current = false;
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
      return;
    }

    let isMounted = true;

    const setupPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
      }

      ytPlayerRef.current = new window.YT.Player('youtube-player-mount', {
        videoId: ytVideoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          cc_load_policy: 1
        },
        events: {
          onReady: (event) => {
            if (!isMounted) return;
            isYtReady.current = true;
            const dur = event.target.getDuration();
            if (dur) setDuration(dur);

            try {
              const trackList = event.target.getOption?.('captions', 'tracklist') || [];
              if (trackList.length > 0) setYtCaptions(trackList);
            } catch {}

            if (currentTime > 0) {
              event.target.seekTo(currentTime, true);
            }
            if (isPlayingRef.current) {
              event.target.playVideo();
            } else {
              event.target.pauseVideo();
            }

            if (isMutedRef.current) event.target.mute();
            else {
              event.target.unMute();
              event.target.setVolume(userVolumeRef.current * 100);
            }
          },
          onStateChange: (event) => {
            if (!isMounted || isInternalYT.current) return;

            try {
              const trackList = ytPlayerRef.current?.getOption?.('captions', 'tracklist') || [];
              if (trackList.length > 0) setYtCaptions(trackList);
            } catch {}

            if (event.data === 1) {
              if (!isPlayingRef.current) {
                if (hasControlAccessRef.current) {
                  const ct = ytPlayerRef.current?.getCurrentTime() || 0;
                  socketRef.current?.emit('SYNC_ACTION', { actionType: 'PLAY', timestamp: ct });
                } else {
                  isInternalYT.current = true;
                  ytPlayerRef.current?.pauseVideo();
                  setTimeout(() => { isInternalYT.current = false; }, 300);
                }
              }
            } else if (event.data === 2) {
              if (isPlayingRef.current) {
                if (hasControlAccessRef.current) {
                  const ct = ytPlayerRef.current?.getCurrentTime() || 0;
                  socketRef.current?.emit('SYNC_ACTION', { actionType: 'PAUSE', timestamp: ct });
                } else {
                  isInternalYT.current = true;
                  ytPlayerRef.current?.playVideo();
                  setTimeout(() => { isInternalYT.current = false; }, 300);
                }
              }
            } else if (event.data === 0) {
              handleVideoEnded();
            }
          }
        }
      });

      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
      ytIntervalRef.current = setInterval(() => {
        if (
          ytPlayerRef.current &&
          isYtReady.current &&
          !isLocalDragging.current &&
          !isInternalYT.current &&
          typeof ytPlayerRef.current.getCurrentTime === 'function'
        ) {
          const ct = ytPlayerRef.current.getCurrentTime() || 0;
          setCurrentTime(ct);
          const dur = ytPlayerRef.current.getDuration() || 0;
          if (dur > 0) setDuration(dur);
        }
      }, 500);
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      window.onYouTubeIframeAPIReady = setupPlayer;
      document.body.appendChild(tag);
    } else {
      setupPlayer();
    }

    return () => {
      isMounted = false;
      isYtReady.current = false;
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, [ytVideoId, isYouTube]);

  useEffect(() => {
    if (!isYouTube || !ytPlayerRef.current || !isYtReady.current || typeof ytPlayerRef.current.setVolume !== 'function') return;
    try {
      if (isMuted) {
        ytPlayerRef.current.mute();
      } else {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(userVolume * 100);
      }
    } catch {}
  }, [userVolume, isMuted, isYouTube]);

  const handleCustomSeek = (targetTime) => {
    if (isYouTube && ytPlayerRef.current && isYtReady.current && typeof ytPlayerRef.current.seekTo === 'function') {
      isInternalYT.current = true;
      ytPlayerRef.current.seekTo(targetTime, true);
      setTimeout(() => { isInternalYT.current = false; }, 600);
    } else if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleYtCaptionSelect = (track) => {
    try {
      if (track === 'off') {
        ytPlayerRef.current?.setOption?.('captions', 'track', {});
        setCurrentYtCaption('off');
      } else {
        ytPlayerRef.current?.setOption?.('captions', 'track', { languageCode: track.languageCode });
        setCurrentYtCaption(track.languageName || track.displayName || track.languageCode);
      }
      setSettingsView(null);
    } catch {}
  };

  const seekPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleFullscreenSubmitMessage = (e) => {
    e.preventDefault();
    if (!fullscreenChatInput.trim()) return;
    onSendMessage(fullscreenChatInput.trim());
    setFullscreenChatInput('');
  };

  const toggleFullscreenChat = () => {
    const nextState = !isFullscreenChatOpen;
    setIsFullscreenChatOpen(nextState);
    if (nextState) onResetUnread();
  };

  return (
    <div
      ref={playerContainerRef}
      style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        aspectRatio: isFullscreen ? 'auto' : '16/9',
        height: isFullscreen ? '100vh' : 'auto',
        background: '#030712',
        borderRadius: isFullscreen ? 0 : 22,
        overflow: 'hidden',
        border: isFullscreen ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: isFullscreen ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}
    >
      {/* YouTube Player Mount */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
          display: isYouTube ? 'block' : 'none',
          pointerEvents: 'none'
        }}
      >
        <div id="youtube-player-mount" style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Native HTML5 Video Element */}
      <video
        ref={videoRef}
        playsInline
        crossOrigin="anonymous"
        onPlay={handleNativePlay}
        onPause={handleNativePause}
        onSeeked={handleNativeSeeked}
        onEnded={handleVideoEnded}
        onWaiting={() => {
          if (!isPlaying) return;
          if (bufferDebounceTimer?.current) clearTimeout(bufferDebounceTimer.current);
          bufferDebounceTimer.current = setTimeout(() => {
            if (isPlaying) socketRef.current?.emit('CLIENT_BUFFERING');
          }, 600);
        }}
        onPlaying={() => {
          if (bufferDebounceTimer?.current) clearTimeout(bufferDebounceTimer.current);
          socketRef.current?.emit('CLIENT_BUFFER_READY');
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          background: '#000',
          display: isYouTube ? 'none' : 'block',
          cursor: hasControlAccess ? 'pointer' : 'default'
        }}
        onClick={togglePlay}
      />

      {/* Processing State Overlay */}
      {isProcessing && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(3, 7, 18, 0.94)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 40,
            gap: 14
          }}
        >
          <Loader2 className="animate-spin" size={44} color="#38bdf8" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
              {processState?.label || 'Preparing Video Stream...'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>
              Connecting and synchronizing stream across room participants
            </div>
          </div>
        </div>
      )}

      {/* Buffering Peer Overlay */}
      {!isProcessing && bufferStatus && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            backdropFilter: 'blur(12px)',
            padding: '6px 14px',
            borderRadius: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#38bdf8',
            fontSize: 12,
            fontWeight: 600,
            zIndex: 35
          }}
        >
          <Loader2 className="animate-spin" size={14} color="#38bdf8" />
          <span>{bufferStatus}</span>
        </div>
      )}

      {/* Floating Animated Reactions */}
      {activeReactions.map((r) => (
        <div
          key={r.id}
          style={{
            position: 'absolute',
            bottom: 70,
            left: `${r.leftOffset || 50}%`,
            fontSize: 38,
            pointerEvents: 'none',
            zIndex: 55,
            animation: 'reactionFloat 2.2s cubic-bezier(0.2, 0.8, 0.3, 1) forwards'
          }}
        >
          {r.emoji}
        </div>
      ))}

      {/* Top Media Bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          zIndex: 30
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <div
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              padding: '4px 8px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              color: '#38bdf8',
              whiteSpace: 'nowrap'
            }}
          >
            Live Sync
          </div>
          <span
            style={{
              color: '#f8fafc',
              fontSize: 14,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            {currentMediaTitle}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {isFullscreen && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '4px 8px',
                borderRadius: 9999
              }}
            >
              <button
                onClick={toggleMic}
                style={{
                  background: isMicMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)',
                  border: 'none',
                  color: isMicMuted ? '#ef4444' : '#22c55e',
                  padding: '4px 8px',
                  borderRadius: 9999,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                {isMicMuted ? <MicOff size={13} /> : <Mic size={13} />}
                <span>{isMicMuted ? 'Muted' : 'Live'}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {roomParticipants.map((p) => {
                  const isSpeaking = speakingPeers.has(p.socketId) || speakingPeers.has(p.peerId);
                  return (
                    <div
                      key={p.socketId}
                      style={{
                        padding: '2px 6px',
                        borderRadius: 9999,
                        fontSize: 10,
                        fontWeight: 600,
                        color: isSpeaking ? '#22c55e' : '#cbd5e1',
                        background: isSpeaking ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: isSpeaking ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid transparent'
                      }}
                    >
                      {p.username}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={createBookmarkAtCurrentTime}
            title="Bookmark current timestamp"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 9999,
              padding: '5px 12px',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <BookmarkPlus size={14} color="#38bdf8" />
            <span>Pin Scene</span>
          </button>
        </div>
      </div>

      {/* Fullscreen Floating Chat Trigger */}
      {isFullscreen && !isFullscreenChatOpen && (
        <button
          onClick={toggleFullscreenChat}
          title="Open Fullscreen Chat"
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRight: 'none',
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
            padding: '12px 10px',
            color: '#38bdf8',
            cursor: 'pointer',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            opacity: showControls ? 1 : 0.45
          }}
        >
          <MessageSquare size={18} />
          {unreadCount > 0 && (
            <span
              style={{
                background: '#38bdf8',
                color: '#030712',
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 5px',
                borderRadius: 9999
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Fullscreen Sliding Chat Drawer */}
      {isFullscreen && isFullscreenChatOpen && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 'clamp(280px, 28vw, 340px)',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(30px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
            zIndex: 70,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-15px 0 35px rgba(0, 0, 0, 0.8)'
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <MessageSquare size={16} color="#38bdf8" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Cinema Live Chat</span>
            </div>
            <button
              onClick={() => setIsFullscreenChatOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                borderRadius: 8,
                padding: '4px',
                display: 'flex'
              }}
            >
              <X size={15} />
            </button>
          </div>

          <div style={{ flex: 1, padding: '12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                No messages yet.
              </div>
            ) : (
              messages.map((m) => {
                const isMine = m.senderSocketId === currentSocketId || m.username === currentUsername;
                return (
                  <div key={m.id} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: isMine ? 0 : 4, textAlign: isMine ? 'right' : 'left' }}>
                      {isMine ? 'You' : m.username} • {m.timestamp}
                    </span>
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: 14,
                        borderBottomRightRadius: isMine ? 3 : 14,
                        borderBottomLeftRadius: isMine ? 14 : 3,
                        background: isMine ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
                        color: isMine ? '#030712' : '#f8fafc',
                        fontSize: 12,
                        fontWeight: 500,
                        wordBreak: 'break-word'
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ padding: '6px 12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, background: 'rgba(0, 0, 0, 0.2)' }}>
            {EMOJI_REACTIONS.map((emoji) => (
              <button key={emoji} onClick={() => onSendReaction(emoji)} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', padding: 4 }}>
                {emoji}
              </button>
            ))}
          </div>

          <form onSubmit={handleFullscreenSubmitMessage} style={{ padding: '10px 12px 14px 12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Send message..."
              value={fullscreenChatInput}
              onChange={(e) => setFullscreenChatInput(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 12,
                padding: '8px 12px',
                color: '#fff',
                fontSize: 12,
                outline: 'none'
              }}
            />
            <button type="submit" style={{ background: '#38bdf8', border: 'none', borderRadius: 12, padding: '8px 12px', color: '#030712', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={13} />
            </button>
          </form>
        </div>
      )}

      {/* Settings Popover Menu */}
      {settingsView && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 74,
            right: 20,
            width: 250,
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: 16,
            padding: 8,
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}
        >
          {settingsView === 'main' && (
            <>
              {!isYouTube && (
                <button
                  onClick={() => setSettingsView('audio')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 10px',
                    color: '#f8fafc',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <span>Audio Tracks</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8' }}>
                    <span style={{ fontSize: 11, color: '#38bdf8' }}>{currentAudioLabel}</span>
                    <ChevronRight size={14} />
                  </div>
                </button>
              )}

              <button
                onClick={() => setSettingsView('subtitles')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 10px',
                  color: '#f8fafc',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Subtitles size={14} color="#94a3b8" />
                  <span>Subtitles / CC</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8' }}>
                  <span style={{ fontSize: 11, color: '#38bdf8' }}>
                    {isYouTube ? currentYtCaption : currentSubLabel}
                  </span>
                  <ChevronRight size={14} />
                </div>
              </button>

              {hasControlAccess ? (
                <button
                  onClick={() => setSettingsView('speed')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 10px',
                    color: '#f8fafc',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Gauge size={14} color="#94a3b8" />
                    <span>Playback Speed</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8' }}>
                    <span style={{ fontSize: 11, color: '#38bdf8' }}>{playbackSpeed}x</span>
                    <ChevronRight size={14} />
                  </div>
                </button>
              ) : (
                <div style={{ padding: '8px 10px', color: '#64748b', fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Playback Speed</span>
                  <span>{playbackSpeed}x (Host Only)</span>
                </div>
              )}

              {isYouTube && (
                <div style={{ 
                  margin: '4px 2px 2px 2px', 
                  padding: '6px 8px', 
                  background: 'rgba(255, 255, 255, 0.04)', 
                  borderRadius: 8, 
                  fontSize: 11, 
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <Tv size={12} color="#38bdf8" />
                  <span>Quality: Auto (Adaptive HD)</span>
                </div>
              )}
            </>
          )}

          {/* Subtitles Submenu */}
          {settingsView === 'subtitles' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => setSettingsView('main')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
                  <ArrowLeft size={14} />
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>Subtitles</span>
              </div>
              <button
                onClick={() => {
                  if (isYouTube) handleYtCaptionSelect('off');
                  else handleSubtitleChange('off');
                }}
                style={{
                  background: (isYouTube ? currentYtCaption === 'off' : selectedSubtitleId === 'off') ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  padding: '7px 10px',
                  color: (isYouTube ? currentYtCaption === 'off' : selectedSubtitleId === 'off') ? '#38bdf8' : '#f8fafc',
                  fontSize: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <span>Off</span>
                {(isYouTube ? currentYtCaption === 'off' : selectedSubtitleId === 'off') && <Check size={14} />}
              </button>

              {isYouTube ? (
                ytCaptions.map((c, idx) => {
                  const label = c.displayName || c.languageName || c.languageCode;
                  const isSelected = currentYtCaption === label;
                  return (
                    <button
                      key={c.languageCode || idx}
                      onClick={() => handleYtCaptionSelect(c)}
                      style={{
                        background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        padding: '7px 10px',
                        color: isSelected ? '#38bdf8' : '#f8fafc',
                        fontSize: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{label}</span>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })
              ) : (
                <>
                  {availableSubtitles.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => handleSubtitleChange(sub)}
                      style={{
                        background: selectedSubtitleId === sub.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        padding: '7px 10px',
                        color: selectedSubtitleId === sub.id ? '#38bdf8' : '#f8fafc',
                        fontSize: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{sub.label}</span>
                      {selectedSubtitleId === sub.id && <Check size={14} />}
                    </button>
                  ))}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#38bdf8',
                      background: 'rgba(56, 189, 248, 0.1)',
                      cursor: 'pointer',
                      marginTop: 4
                    }}
                  >
                    <UploadCloud size={14} />
                    <span>Upload Custom .SRT/.VTT</span>
                    <input type="file" accept=".srt,.vtt" onChange={handleCustomSubtitleFile} style={{ display: 'none' }} />
                  </label>
                </>
              )}
            </>
          )}

          {/* Audio Tracks Submenu */}
          {settingsView === 'audio' && !isYouTube && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => setSettingsView('main')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
                  <ArrowLeft size={14} />
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>Audio Tracks</span>
              </div>
              {availableAudioTracks.length === 0 ? (
                <div style={{ padding: '8px 10px', fontSize: 12, color: '#94a3b8' }}>Default Audio Track</div>
              ) : (
                availableAudioTracks.map((trk, idx) => (
                  <button
                    key={trk.id || idx}
                    onClick={() => handleAudioTrackChange(idx)}
                    style={{
                      background: selectedAudioTrackIndex === idx ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      padding: '7px 10px',
                      color: selectedAudioTrackIndex === idx ? '#38bdf8' : '#f8fafc',
                      fontSize: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{trk.label || `Track ${idx + 1}`}</span>
                    {selectedAudioTrackIndex === idx && <Check size={14} />}
                  </button>
                ))
              )}
            </>
          )}

          {/* Speed Submenu */}
          {settingsView === 'speed' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => setSettingsView('main')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
                  <ArrowLeft size={14} />
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>Playback Speed</span>
              </div>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((sp) => (
                <button
                  key={sp}
                  onClick={() => {
                    setPlaybackSpeed(sp);
                    if (engineRef?.current?.setSpeed) {
                      engineRef.current.setSpeed(sp);
                    }
                    socketRef.current?.emit('SYNC_ACTION', { actionType: 'SPEED', speed: sp });
                    setSettingsView(null);
                  }}
                  style={{
                    background: playbackSpeed === sp ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    padding: '7px 10px',
                    color: playbackSpeed === sp ? '#38bdf8' : '#f8fafc',
                    fontSize: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <span>{sp === 1 ? 'Normal (1.0x)' : `${sp}x`}</span>
                  {playbackSpeed === sp && <Check size={14} />}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Floating Control Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '24px 20px 14px 20px',
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          zIndex: 30
        }}
      >
        {/* Scrub Bar */}
        <div style={{ position: 'relative', width: '100%', height: 14, display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', width: '100%', height: 4, borderRadius: 9999, background: 'rgba(255, 255, 255, 0.2)', overflow: 'hidden' }}>
            <div style={{ width: `${seekPercentage}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #818cf8)' }} />
          </div>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            disabled={!hasControlAccess}
            onMouseDown={() => {
              isLocalDragging.current = true;
              handleSeekStart();
            }}
            onTouchStart={() => {
              isLocalDragging.current = true;
              handleSeekStart();
            }}
            onChange={handleSeekChange}
            onMouseUp={(e) => {
              isLocalDragging.current = false;
              handleSeekEnd(e);
              handleCustomSeek(parseFloat(e.target.value));
            }}
            onTouchEnd={(e) => {
              isLocalDragging.current = false;
              handleSeekEnd(e);
              handleCustomSeek(parseFloat(e.target.value));
            }}
            style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: hasControlAccess ? 'pointer' : 'not-allowed' }}
          />
        </div>

        {/* Control Groups */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
          {/* Left: Volume & Timers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <button onClick={toggleMute} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex' }}>
              {isMuted || userVolume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : userVolume} onChange={handleVolumeChange} style={{ width: 65, accentColor: '#38bdf8', cursor: 'pointer' }} />
            <div style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', letterSpacing: '0.04em', whiteSpace: 'nowrap', minWidth: 88 }}>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>{formatTime(currentTime)}</span>
              <span style={{ margin: '0 4px', color: '#64748b' }}>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Center: Play / Pause / Skip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexShrink: 0 }}>
            <button onClick={() => skipSeconds(-10)} disabled={!hasControlAccess} title="Rewind 10s" style={{ background: 'transparent', border: 'none', color: hasControlAccess ? '#cbd5e1' : '#475569', cursor: hasControlAccess ? 'pointer' : 'not-allowed', padding: 4, display: 'flex' }}>
              <RotateCcw size={18} />
            </button>
            <button
              onClick={togglePlay}
              disabled={!hasControlAccess}
              title={isPlaying ? 'Pause' : 'Play'}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: hasControlAccess ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: hasControlAccess ? '#fff' : '#64748b',
                cursor: hasControlAccess ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
            </button>
            <button onClick={() => skipSeconds(10)} disabled={!hasControlAccess} title="Forward 10s" style={{ background: 'transparent', border: 'none', color: hasControlAccess ? '#cbd5e1' : '#475569', cursor: hasControlAccess ? 'pointer' : 'not-allowed', padding: 4, display: 'flex' }}>
              <RotateCw size={18} />
            </button>
            <button onClick={playNextVideo} disabled={!hasControlAccess || currentQueueIndex >= queue.length - 1} title="Next" style={{ background: 'transparent', border: 'none', color: !hasControlAccess || currentQueueIndex >= queue.length - 1 ? '#475569' : '#cbd5e1', cursor: !hasControlAccess || currentQueueIndex >= queue.length - 1 ? 'not-allowed' : 'pointer', padding: 4, display: 'flex' }}>
              <SkipForward size={18} />
            </button>
          </div>

          {/* Right: Subtitles, Settings, PiP, Fullscreen */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flex: 1, minWidth: 0 }}>
            {!isYouTube && (
              <button
                onClick={() => setSettingsView(settingsView === 'subtitles' ? null : 'subtitles')}
                title="Subtitles"
                style={{
                  background: selectedSubtitleId !== 'off' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  border: 'none',
                  color: selectedSubtitleId !== 'off' ? '#38bdf8' : '#cbd5e1',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                  display: 'flex'
                }}
              >
                <Subtitles size={18} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSettingsView(settingsView ? null : 'main');
              }}
              title="Playback Settings"
              style={{
                background: settingsView ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                border: 'none',
                color: settingsView ? '#38bdf8' : '#cbd5e1',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
                display: 'flex'
              }}
            >
              <Settings size={18} />
            </button>

            {!isYouTube && (
              <button onClick={togglePiP} title="Picture-in-Picture" style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <PictureInPicture2 size={18} />
              </button>
            )}

            <button onClick={toggleFullscreen} title="Toggle Fullscreen" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex' }}>
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}