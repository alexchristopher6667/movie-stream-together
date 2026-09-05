import React from 'react';
import { ChevronRight, ChevronLeft, Languages, Subtitles, Gauge, Check } from 'lucide-react';

export default function SettingsPopover({
  settingsView,
  setSettingsView,
  availableAudioTracks,
  selectedAudioTrackIndex,
  availableSubtitles,
  selectedSubtitleId,
  currentAudioLabel,
  currentSubLabel,
  hasControlAccess,
  playbackSpeed,
  handleAudioTrackChange,
  handleSubtitleChange,
  setPlaybackSpeed,
  videoRef,
  extraAudioRef
}) {
  if (!settingsView) return null;

  return (
    <div
      style={{
        position: 'absolute',
        right: 14,
        bottom: 74,
        width: 'clamp(240px, 80vw, 280px)',
        background: 'rgba(20, 24, 33, 0.9)',
        backdropFilter: 'blur(36px)',
        WebkitBackdropFilter: 'blur(36px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 18,
        padding: 6,
        zIndex: 35,
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)'
      }}
    >
      {settingsView === 'main' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            onClick={() => setSettingsView('audio')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 12, fontSize: 13, color: '#f3f4f6', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Languages size={15} color="#9ca3af" />
              <span>Audio Track</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9ca3af', fontSize: 12 }}>
              <span>{currentAudioLabel}</span>
              <ChevronRight size={13} />
            </div>
          </div>

          <div
            onClick={() => setSettingsView('subtitles')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 12, fontSize: 13, color: '#f3f4f6', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Subtitles size={15} color="#9ca3af" />
              <span>Subtitles</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9ca3af', fontSize: 12 }}>
              <span>{currentSubLabel}</span>
              <ChevronRight size={13} />
            </div>
          </div>

          {hasControlAccess && (
            <div
              onClick={() => setSettingsView('speed')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 12, fontSize: 13, color: '#f3f4f6', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Gauge size={15} color="#9ca3af" />
                <span>Speed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9ca3af', fontSize: 12 }}>
                <span>{playbackSpeed}x</span>
                <ChevronRight size={13} />
              </div>
            </div>
          )}
        </div>
      )}

      {settingsView === 'subtitles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            onClick={() => setSettingsView('main')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 12, color: '#9ca3af', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}
          >
            <ChevronLeft size={14} />
            <span>Back</span>
          </div>
          <div
            onClick={() => handleSubtitleChange('off')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, fontSize: 12, color: selectedSubtitleId === 'off' ? '#38bdf8' : '#f3f4f6', cursor: 'pointer' }}
          >
            <span>Off</span>
            {selectedSubtitleId === 'off' && <Check size={13} />}
          </div>
          {availableSubtitles.map((s) => (
            <div
              key={s.id}
              onClick={() => handleSubtitleChange(s)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, fontSize: 12, color: selectedSubtitleId === s.id ? '#38bdf8' : '#f3f4f6', cursor: 'pointer' }}
            >
              <span>{s.label}</span>
              {selectedSubtitleId === s.id && <Check size={13} />}
            </div>
          ))}
        </div>
      )}

      {settingsView === 'audio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            onClick={() => setSettingsView('main')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 12, color: '#9ca3af', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}
          >
            <ChevronLeft size={14} />
            <span>Back</span>
          </div>
          {availableAudioTracks.length === 0 ? (
            <div style={{ padding: '6px 10px', fontSize: 12, color: '#6b7280' }}>Default Audio</div>
          ) : (
            availableAudioTracks.map((a) => (
              <div
                key={a.index}
                onClick={() => handleAudioTrackChange(a.index)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, fontSize: 12, color: selectedAudioTrackIndex === a.index ? '#38bdf8' : '#f3f4f6', cursor: 'pointer' }}
              >
                <span>{a.label}</span>
                {selectedAudioTrackIndex === a.index && <Check size={13} />}
              </div>
            ))
          )}
        </div>
      )}

      {settingsView === 'speed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            onClick={() => setSettingsView('main')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 12, color: '#9ca3af', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}
          >
            <ChevronLeft size={14} />
            <span>Back</span>
          </div>
          {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
            <div
              key={spd}
              onClick={() => {
                setPlaybackSpeed(spd);
                if (videoRef.current) videoRef.current.playbackRate = spd;
                if (extraAudioRef.current) extraAudioRef.current.playbackRate = spd;
                setSettingsView(null);
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, fontSize: 12, color: playbackSpeed === spd ? '#38bdf8' : '#f3f4f6', cursor: 'pointer' }}
            >
              <span>{spd === 1 ? 'Normal (1x)' : `${spd}x`}</span>
              {playbackSpeed === spd && <Check size={13} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}