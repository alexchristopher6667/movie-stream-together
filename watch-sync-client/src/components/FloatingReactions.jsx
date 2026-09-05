import React from 'react';

export default function FloatingReactions({ activeReactions }) {
  return (
    <>
      {activeReactions.map((r) => (
        <div key={r.id} className="floating-reaction" style={{ left: `${r.leftOffset}%` }}>
          {r.emoji}
        </div>
      ))}
    </>
  );
}