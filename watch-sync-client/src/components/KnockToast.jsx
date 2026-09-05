import React from 'react';
import { DoorOpen, Check, X } from 'lucide-react';

export default function KnockToast({ knocks = [], onAdmit, onDecline }) {
  if (!knocks || knocks.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'center',
        pointerEvents: 'none',
        width: '100%',
        maxWidth: 420,
        padding: '0 12px',
        boxSizing: 'border-box'
      }}
    >
      {knocks.map((knock) => (
        <div
          key={knock.socketId || knock.username}
          style={{
            pointerEvents: 'auto',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: 16,
            padding: '8px 14px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.65), 0 0 15px rgba(56, 189, 248, 0.15)',
            animation: 'fadeInSlideDown 0.25s ease-out forwards'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <DoorOpen size={15} color="#38bdf8" />
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#f8fafc',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              <strong style={{ color: '#38bdf8' }}>{knock.username}</strong> wants to join
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => onDecline(knock.socketId, knock.username)}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#ef4444',
                padding: '5px 10px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.28)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
            >
              <X size={13} /> Decline
            </button>

            <button
              onClick={() => onAdmit(knock.socketId, knock.username)}
              style={{
                background: '#38bdf8',
                border: 'none',
                color: '#030712',
                padding: '5px 12px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Check size={13} /> Admit
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}