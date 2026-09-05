import React from 'react';
import {
  Users,
  Mic,
  MicOff,
  Volume1,
  VolumeX,
  MessageSquare,
  ListVideo,
  Bookmark,
  Crown,
  Gamepad2,
  MoreVertical,
  LogOut,
  Share2
} from 'lucide-react';
import { pillStyle } from '../utils/helpers';

export default function Header({
  roomId,
  username,
  isHost,
  hasControlAccess,
  hostSocketId,
  allowedControllers = [],
  roomParticipants = [],
  speakingPeers = new Set(),
  peerVolumes = {},
  isLocalSpeaking = false,
  mutedPeers = new Set(),
  isMicMuted,
  toggleMic,
  togglePeerAudio,
  toggleUserControl,
  muteUserMic,
  activeSideDrawer,
  setActiveSideDrawer,
  unreadCount = 0,
  queueLength = 0,
  bookmarksLength = 0,
  onLeaveClick,
  onShareClick,
  activeDropdownSocketId,
  setActiveDropdownSocketId,
  setPendingHostTransferUser,
  setPendingKickUser
}) {
  return (
    <header
      style={{
        position: 'relative',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        marginBottom: 12,
        padding: '0 2px'
      }}
    >
      {/* Top Primary Navigation Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          minHeight: 40
        }}
      >
        {/* Room Badge Pill with Direct Share Action */}
        <div style={pillStyle}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', marginLeft: 4 }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af', marginLeft: 6 }}>Room:</span>
          <strong style={{ color: '#fff', fontSize: 12, marginLeft: 4, marginRight: 6 }}>{roomId}</strong>
          <button
            onClick={onShareClick}
            title="Copy Room Link"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              cursor: 'pointer',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Share2 size={13} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          {/* Bookmarks Drawer Toggle */}
          <div style={pillStyle}>
            <button
              onClick={() => setActiveSideDrawer(activeSideDrawer === 'bookmarks' ? null : 'bookmarks')}
              style={{
                background: activeSideDrawer === 'bookmarks' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                border: 'none',
                color: activeSideDrawer === 'bookmarks' ? '#38bdf8' : '#e5e7eb',
                padding: '5px 8px',
                borderRadius: 9999,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600
              }}
            >
              <Bookmark size={13} />
              <span className="hide-on-mobile">Scenes</span>
              <span
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 9999
                }}
              >
                {bookmarksLength}
              </span>
            </button>
          </div>

          {/* Playlist Queue Drawer Toggle */}
          <div style={pillStyle}>
            <button
              onClick={() => setActiveSideDrawer(activeSideDrawer === 'playlist' ? null : 'playlist')}
              style={{
                background: activeSideDrawer === 'playlist' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                border: 'none',
                color: activeSideDrawer === 'playlist' ? '#38bdf8' : '#e5e7eb',
                padding: '5px 8px',
                borderRadius: 9999,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600
              }}
            >
              <ListVideo size={13} />
              <span className="hide-on-mobile">Playlist</span>
              <span
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 9999
                }}
              >
                {queueLength}
              </span>
            </button>
          </div>

          {/* Chat Drawer Toggle */}
          <div style={pillStyle}>
            <button
              onClick={() => {
                setActiveSideDrawer(activeSideDrawer === 'chat' ? null : 'chat');
              }}
              style={{
                background: activeSideDrawer === 'chat' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                border: 'none',
                color: activeSideDrawer === 'chat' ? '#38bdf8' : '#e5e7eb',
                padding: '5px 8px',
                borderRadius: 9999,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600
              }}
            >
              <MessageSquare size={13} />
              <span className="hide-on-mobile">Chat</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#38bdf8',
                    color: '#030712',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 9999
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Fixed-Width Microphone Toggle */}
          <div style={{ ...pillStyle, width: 'auto' }}>
            <button
              onClick={toggleMic}
              style={{
                background: isMicMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                border: 'none',
                color: isMicMuted ? '#ef4444' : '#22c55e',
                padding: '5px 8px',
                borderRadius: 9999,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                width: 'clamp(36px, 10vw, 84px)',
                boxSizing: 'border-box'
              }}
            >
              {isMicMuted ? <MicOff size={13} /> : <Mic size={13} />}
              <span className="hide-on-mobile" style={{ width: 36, textAlign: 'left' }}>
                {isMicMuted ? 'Muted' : 'Live'}
              </span>
            </button>
          </div>

          {/* Leave Room Pill */}
          <div style={pillStyle}>
            <button
              onClick={onLeaveClick}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: 'none',
                color: '#ef4444',
                padding: '5px 8px',
                borderRadius: 9999,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600
              }}
              title="Leave Room"
            >
              <LogOut size={13} />
              <span className="hide-on-mobile">Leave</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Second Row for All Participants */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 38,
          zIndex: 105
        }}
      >
        <div style={{ ...pillStyle, overflow: 'visible', flexWrap: 'wrap', gap: 6, padding: '4px 8px' }}>
          <Users size={13} color="#38bdf8" style={{ marginLeft: 3, flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, overflow: 'visible' }}>
            
            {/* Local Client Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                color: '#fff',
                padding: '3px 8px',
                borderRadius: 9999,
                whiteSpace: 'nowrap',
                background: isLocalSpeaking
                  ? 'rgba(34, 197, 94, 0.16)'
                  : isHost
                  ? 'rgba(245, 158, 11, 0.2)'
                  : hasControlAccess
                  ? 'rgba(56, 189, 248, 0.15)'
                  : 'rgba(255,255,255,0.06)',
                border: isLocalSpeaking
                  ? '1px solid rgba(34, 197, 94, 0.55)'
                  : isHost
                  ? '1px solid rgba(245, 158, 11, 0.4)'
                  : hasControlAccess
                  ? '1px solid rgba(56, 189, 248, 0.4)'
                  : '1px solid transparent',
                transition: 'background 0.2s ease, border-color 0.2s ease'
              }}
            >
              {isHost && <Crown size={12} color="#f59e0b" />}
              {!isHost && hasControlAccess && <Gamepad2 size={12} color="#38bdf8" />}

              {/* Fixed 14px Reserved Waveform Slot */}
              <div style={{ width: 14, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, flexShrink: 0 }}>
                {isLocalSpeaking ? (
                  <>
                    <span className="equalizer-bar-1" style={{ width: 2, background: '#22c55e', borderRadius: 2 }} />
                    <span className="equalizer-bar-2" style={{ width: 2, background: '#22c55e', borderRadius: 2 }} />
                    <span className="equalizer-bar-3" style={{ width: 2, background: '#22c55e', borderRadius: 2 }} />
                  </>
                ) : (
                  <>
                    <span style={{ width: 2, height: 2, background: 'rgba(255,255,255,0.22)', borderRadius: '50%' }} />
                    <span style={{ width: 2, height: 2, background: 'rgba(255,255,255,0.22)', borderRadius: '50%' }} />
                    <span style={{ width: 2, height: 2, background: 'rgba(255,255,255,0.22)', borderRadius: '50%' }} />
                  </>
                )}
              </div>

              <span>{username} (You)</span>
            </div>

            {/* Remote Participants */}
            {roomParticipants
              .filter((p) => p.username !== username)
              .map((p, idx) => {
                const isSpeaking = speakingPeers.has(p.socketId) || speakingPeers.has(p.peerId);
                const isPeerMuted = mutedPeers.has(p.peerId) || mutedPeers.has(p.socketId);
                const isPeerHost = hostSocketId === p.socketId;
                const isPeerController = allowedControllers.includes(p.socketId);
                const isDropdownOpen = activeDropdownSocketId === p.socketId;

                return (
                  <div
                    key={p.socketId || idx}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 6px',
                      borderRadius: 9999,
                      whiteSpace: 'nowrap',
                      background: isSpeaking ? 'rgba(34, 197, 94, 0.16)' : 'rgba(255,255,255,0.06)',
                      border: isSpeaking
                        ? '1px solid rgba(34, 197, 94, 0.55)'
                        : isPeerController
                        ? '1px solid rgba(56, 189, 248, 0.4)'
                        : '1px solid transparent',
                      transition: 'background 0.2s ease, border-color 0.2s ease',
                      zIndex: isDropdownOpen ? 9999 : 1
                    }}
                  >
                    {isPeerHost && <Crown size={11} color="#f59e0b" />}
                    {!isPeerHost && isPeerController && <Gamepad2 size={11} color="#38bdf8" />}

                    {/* Fixed 14px Reserved Waveform Slot */}
                    <div style={{ width: 14, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, flexShrink: 0 }}>
                      {isSpeaking ? (
                        <>
                          <span className="equalizer-bar-1" style={{ width: 2, background: '#22c55e', borderRadius: 2 }} />
                          <span className="equalizer-bar-2" style={{ width: 2, background: '#22c55e', borderRadius: 2 }} />
                          <span className="equalizer-bar-3" style={{ width: 2, background: '#22c55e', borderRadius: 2 }} />
                        </>
                      ) : (
                        <>
                          <span style={{ width: 2, height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }} />
                          <span style={{ width: 2, height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }} />
                          <span style={{ width: 2, height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }} />
                        </>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: isSpeaking ? '#22c55e' : isPeerMuted ? '#9ca3af' : '#cbd5e1'
                      }}
                    >
                      {p.username}
                    </span>

                    {/* Controller Permission Toggle (Host Only) */}
                    {isHost && (
                      <button
                        onClick={() => toggleUserControl(p.socketId)}
                        title={isPeerController ? 'Revoke control' : 'Grant control'}
                        style={{
                          background: isPeerController ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                          border: 'none',
                          color: isPeerController ? '#38bdf8' : '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px',
                          borderRadius: '50%'
                        }}
                      >
                        <Gamepad2 size={12} />
                      </button>
                    )}

                    {/* Remote Audio Mute Toggle */}
                    <button
                      onClick={() => togglePeerAudio(p.peerId || p.socketId)}
                      title={isPeerMuted ? 'Unmute' : 'Mute'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isPeerMuted ? '#ef4444' : '#9ca3af',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 1.5
                      }}
                    >
                      {isPeerMuted ? <VolumeX size={12} /> : <Volume1 size={12} />}
                    </button>

                    {/* Host Options Trigger */}
                    {isHost && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownSocketId(isDropdownOpen ? null : p.socketId);
                        }}
                        title="Options"
                        style={{
                          background: isDropdownOpen ? 'rgba(255,255,255,0.18)' : 'transparent',
                          border: 'none',
                          color: isDropdownOpen ? '#ffffff' : '#9ca3af',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px 3px',
                          borderRadius: 4
                        }}
                      >
                        <MoreVertical size={12} />
                      </button>
                    )}

                    {/* Host Actions Popover Menu */}
                    {isHost && isDropdownOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          right: 0,
                          width: 160,
                          background: 'rgba(17, 24, 39, 0.98)',
                          backdropFilter: 'blur(36px)',
                          WebkitBackdropFilter: 'blur(36px)',
                          border: '1px solid rgba(255, 255, 255, 0.18)',
                          borderRadius: 12,
                          padding: 6,
                          zIndex: 99999,
                          boxShadow: '0 20px 45px rgba(0,0,0,0.9)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4
                        }}
                      >
                        <button
                          onClick={() => muteUserMic(p.socketId)}
                          style={{
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: 'none',
                            borderRadius: 8,
                            padding: '7px 9px',
                            color: '#38bdf8',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            textAlign: 'left'
                          }}
                        >
                          <MicOff size={13} />
                          <span>Mute Mic</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveDropdownSocketId(null);
                            setPendingHostTransferUser(p);
                          }}
                          style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: 'none',
                            borderRadius: 8,
                            padding: '7px 9px',
                            color: '#f59e0b',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            textAlign: 'left'
                          }}
                        >
                          <Crown size={13} />
                          <span>Give Crown</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveDropdownSocketId(null);
                            setPendingKickUser(p);
                          }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: 'none',
                            borderRadius: 8,
                            padding: '7px 9px',
                            color: '#ef4444',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            textAlign: 'left'
                          }}
                        >
                          <LogOut size={13} />
                          <span>Kick Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </header>
  );
}