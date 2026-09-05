import React from 'react';
import { LogOut } from 'lucide-react';

export default function LeaveModal({ show, roomId, onCancel, onConfirm }) {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'rgba(23, 23, 23, 0.95)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: 22, padding: 20, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: '#ef4444' }}>
          <LogOut size={22} />
        </div>
        <h3 style={{ margin: '0 0 6px 0', fontSize: 17, fontWeight: 700, color: '#fff' }}>Leave Cinema Room?</h3>
        <p style={{ margin: '0 0 20px 0', color: '#9ca3af', fontSize: 13, lineHeight: 1.4 }}>Are you sure you want to leave <strong style={{ color: '#fff' }}>{roomId}</strong>?</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Stay</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Leave</button>
        </div>
      </div>
    </div>
  );
}