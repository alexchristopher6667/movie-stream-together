import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Subtitles,
  Settings,
  PictureInPicture,
  SkipForward
} from 'lucide-react';
import { pillStyle, appleCircleBtn, formatTime } from '../utils/helpers';

export default function MediaControls({
  showControls,
  settingsView,
  progressPercent,
  currentTime,
  duration,
  hasControlAccess,
  isPlaying,
  userVolume,
  isMuted,
  isPiP,
  isFullscreen,
  selectedSubtitleId,
  queue,
  currentQueueIndex,
  handleSeekStart,
  handleSeekChange,
  handleSeekEnd,
  togglePlay,
  skipSeconds,
  playNextVideo,
  toggleMute,
  handleVolumeChange,
  setSettingsView,
  togglePiP,
  toggleFullscreen
}) {
  const isVisible = showControls || settingsView;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
        padding: 'clamp(10px, 2.5vw, 18px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 20,
        visibility: isVisible ? 'visible' : 'hidden',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'visibility 0.25s ease, opacity 0.25s ease, transform 0.25s ease',
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
    >
      {/* Scrub Bar */}
      <div style={{ position: 'relative', width: '100%', height: 4, display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #a855f7, #38bdf8)',
            borderRadius: 9999,
            zIndex: 1,
            pointerEvents: 'none'
          }}
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          step="any"
          value={currentTime}
          disabled={!hasControlAccess}
          onMouseDown={handleSeekStart}
          onTouchStart={handleSeekStart}
          onChange={handleSeekChange}
          onMouseUp={handleSeekEnd}
          onTouchEnd={handleSeekEnd}
          style={{
            width: '100%',
            height: 4,
            zIndex: 2,
            cursor: hasControlAccess ? 'pointer' : 'not-allowed'
          }}
        />
      </div>

      {/* Action Row */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        {/* Left: Volume & Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={pillStyle}>
            <button
              onClick={toggleMute}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e5e7eb',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 4
              }}
            >
              {isMuted || userVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : userVolume}
              onChange={handleVolumeChange}
              className="mobile-slider"
              style={{ width: 52, height: 3, cursor: 'pointer', marginRight: 4 }}
            />
          </div>

          <div style={{ ...pillStyle, padding: '5px 8px', fontSize: 'clamp(10px, 2.5vw, 11px)', fontWeight: 500, color: '#e5e7eb' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Center: Apple-style Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(8px, 2vw, 14px)' }}>
          <button
            onClick={() => skipSeconds(-10)}
            disabled={!hasControlAccess}
            title="Rewind 10s (←)"
            style={appleCircleBtn(36, hasControlAccess)}
            onMouseDown={(e) => { if (hasControlAccess) e.currentTarget.style.transform = 'scale(0.88)'; }}
            onMouseUp={(e) => { if (hasControlAccess) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={togglePlay}
            disabled={!hasControlAccess}
            style={appleCircleBtn(44, hasControlAccess)}
            onMouseDown={(e) => { if (hasControlAccess) e.currentTarget.style.transform = 'scale(0.9)'; }}
            onMouseUp={(e) => { if (hasControlAccess) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {isPlaying ? (
              <Pause size={18} fill={hasControlAccess ? '#fff' : '#64748b'} />
            ) : (
              <Play size={18} fill={hasControlAccess ? '#fff' : '#64748b'} style={{ marginLeft: 2 }} />
            )}
          </button>

          <button
            onClick={() => skipSeconds(10)}
            disabled={!hasControlAccess}
            title="Forward 10s (→)"
            style={appleCircleBtn(36, hasControlAccess)}
            onMouseDown={(e) => { if (hasControlAccess) e.currentTarget.style.transform = 'scale(0.88)'; }}
            onMouseUp={(e) => { if (hasControlAccess) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <RotateCw size={15} />
          </button>

          <button
            onClick={playNextVideo}
            disabled={!hasControlAccess || currentQueueIndex >= queue.length - 1}
            title="Play Next (N)"
            className="hide-on-mobile"
            style={appleCircleBtn(32, hasControlAccess && currentQueueIndex < queue.length - 1)}
          >
            <SkipForward size={13} />
          </button>
        </div>

        {/* Right Controls */}
        <div style={pillStyle}>
          <button
            onClick={() => setSettingsView(settingsView ? null : 'subtitles')}
            style={{
              background: selectedSubtitleId !== 'off' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              border: 'none',
              color: selectedSubtitleId !== 'off' ? '#38bdf8' : '#9ca3af',
              padding: '5px 7px',
              borderRadius: 9999,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Subtitles"
          >
            <Subtitles size={15} />
          </button>

          <button
            onClick={() => setSettingsView(settingsView ? null : 'main')}
            style={{
              background: settingsView ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              border: 'none',
              color: '#e5e7eb',
              padding: '5px 7px',
              borderRadius: 9999,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Settings"
          >
            <Settings size={15} />
          </button>

          <button
            onClick={togglePiP}
            className="hide-on-mobile"
            style={{
              background: isPiP ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              border: 'none',
              color: isPiP ? '#38bdf8' : '#e5e7eb',
              padding: '5px 7px',
              borderRadius: 9999,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Picture-in-Picture (P)"
          >
            <PictureInPicture size={15} />
          </button>

          <button
            onClick={toggleFullscreen}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e5e7eb',
              padding: '5px 7px',
              borderRadius: 9999,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Fullscreen (F)"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}