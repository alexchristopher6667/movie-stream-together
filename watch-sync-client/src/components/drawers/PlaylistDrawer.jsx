import React from 'react';
import { Play, Trash2, Plus, Loader2, ListVideo } from 'lucide-react';

export default function PlaylistDrawer({
  queue = [],
  currentQueueIndex = 0,
  hasControlAccess,
  playQueueIndex,
  removeFromQueue,
  handleFileSelect,
  uploadProgress = null // { percent, label }
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      {/* Active Queue Transcode/Upload Progress Bar */}
      {uploadProgress && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(56, 189, 248, 0.08)',
            borderBottom: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
            <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Loader2 className="animate-spin" size={13} color="#38bdf8" />
              {uploadProgress.label || 'Processing queue item...'}
            </span>
            <span style={{ color: '#f8fafc', fontVariantNumeric: 'tabular-nums' }}>
              {uploadProgress.percent}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 4,
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 9999,
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${uploadProgress.percent}%`,
                height: '100%',
                background: '#38bdf8',
                borderRadius: 9999,
                transition: 'width 0.2s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* Scrollable Queue List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}
      >
        {queue.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
            <ListVideo size={24} style={{ margin: '0 auto 6px auto', opacity: 0.5 }} />
            Playlist is empty
          </div>
        ) : (
          queue.map((item, idx) => {
            const isCurrent = currentQueueIndex === idx;
            return (
              <div
                key={item.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 12,
                  background: isCurrent ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                  border: isCurrent ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'background 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isCurrent ? '#38bdf8' : '#64748b',
                      minWidth: 16,
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isCurrent ? '#f8fafc' : '#cbd5e1',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.title}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {hasControlAccess && (
                    <>
                      {!isCurrent && (
                        <button
                          onClick={() => playQueueIndex(idx)}
                          title="Play this stream"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#38bdf8',
                            cursor: 'pointer',
                            padding: 4,
                            display: 'flex',
                            borderRadius: 6
                          }}
                        >
                          <Play size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => removeFromQueue(idx)}
                        title="Remove from queue"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          borderRadius: 6
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Add-to-Queue Quick Button */}
      {hasControlAccess && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              padding: '8px 12px',
              borderRadius: 12,
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
          >
            <Plus size={14} />
            <span>Add File to Queue</span>
            <input
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e, true)}
            />
          </label>
        </div>
      )}
    </div>
  );
}