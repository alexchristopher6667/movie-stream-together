import React from 'react';
import { BookmarkPlus, Trash2 } from 'lucide-react';

export default function BookmarksDrawer({
  bookmarks,
  hasControlAccess,
  jumpToBookmark,
  deleteBookmark,
  createBookmarkAtCurrentTime
}) {
  return (
    <>
      <div style={{ flex: 1, padding: 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380 }}>
        {bookmarks.length === 0 ? (
          <div style={{ margin: 'auto', color: '#6b7280', fontSize: 12, textAlign: 'center' }}>
            No bookmarks saved.
          </div>
        ) : (
          bookmarks.map((bm) => (
            <div
              key={bm.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div
                onClick={() => jumpToBookmark(bm.timestamp)}
                style={{
                  flex: 1,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#38bdf8',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {bm.label}
                </div>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>
                  Pinned by {bm.creator}
                </span>
              </div>

              {hasControlAccess && (
                <button
                  onClick={() => deleteBookmark(bm.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '3px',
                    display: 'flex'
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ padding: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <button
          onClick={createBookmarkAtCurrentTime}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: 10,
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5
          }}
        >
          <BookmarkPlus size={14} />
          <span>Pin Current Scene</span>
        </button>
      </div>
    </>
  );
}