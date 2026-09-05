import React from 'react';

export default function EventLog({ logs }) {
  return (
    <div style={{
      marginTop: 14,
      background: 'rgba(255, 255, 255, 0.02)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      padding: 14,
      borderRadius: 16
    }}>
      <h4 style={{ margin: '0 0 8px 0', color: '#9ca3af', fontSize: 12, fontWeight: 500 }}>
        Live Room Events
      </h4>
      <div style={{ maxHeight: 90, overflowY: 'auto', fontSize: 12, color: '#d1d5db', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {logs.map((log, index) => (
          <div key={index} style={{ padding: '1px 0' }}>{log}</div>
        ))}
      </div>
    </div>
  );
}