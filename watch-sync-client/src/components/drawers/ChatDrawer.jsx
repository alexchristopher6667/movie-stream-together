import React, { useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';

export default function ChatDrawer({
  messages = [],
  currentSocketId = null,
  chatInput = '',
  setChatInput = () => {},
  handleSendMessage = () => {}
}) {
  const messagesContainerRef = useRef(null);

  // Scroll only the internal chat container to bottom, NEVER the whole page window
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

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
      {/* Scrollable Messages Container */}
      <div
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        {messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
            <MessageSquare size={22} style={{ margin: '0 auto 6px auto', opacity: 0.4 }} />
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.senderSocketId === currentSocketId;
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: '#94a3b8',
                    marginLeft: isMine ? 0 : 4,
                    marginRight: isMine ? 4 : 0,
                    textAlign: isMine ? 'right' : 'left'
                  }}
                >
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
                    lineHeight: 1.4,
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

      {/* Input Message Form */}
      <form
        onSubmit={handleSendMessage}
        style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          gap: 8,
          background: 'rgba(0, 0, 0, 0.15)'
        }}
      >
        <input
          type="text"
          placeholder="Send message..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
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
        <button
          type="submit"
          style={{
            background: '#38bdf8',
            border: 'none',
            borderRadius: 12,
            padding: '8px 12px',
            color: '#030712',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Send size={13} />
        </button>
      </form>
    </div>
  );
}