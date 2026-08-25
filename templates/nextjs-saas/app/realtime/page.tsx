'use client';

import React, { useState } from 'react';
import { useSession, useRealtimeChannel } from '@sparrowbase/react';

export default function RealtimePage() {
  const { user } = useSession();
  const [roomInput, setRoomInput] = useState('general');
  const [roomId, setRoomId] = useState('general');
  const [chatInput, setChatInput] = useState('');

  const { isConnected, peers, messages, sendMessage } = useRealtimeChannel(roomId, {
    userId: user?.id || 'guest',
    name: user?.name || user?.email || 'Guest User',
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage({ text: chatInput, senderName: user?.name || user?.email || 'Guest' });
    setChatInput('');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>⚡ Realtime Multiplayer Room</h1>
          <p style={{ color: '#a1a1aa', margin: '4px 0 0', fontSize: '14px' }}>
            Powered by Cloudflare Durable Objects and WebSockets.
          </p>
        </div>
        <a href="/dashboard" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '600' }}>
          ← Back to Dashboard
        </a>
      </header>

      {/* Room Selector & Connection Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#18181b', padding: '16px 20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #27272a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '14px', color: '#a1a1aa' }}>Room:</label>
          <input
            type="text"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            style={{ background: '#09090b', border: '1px solid #27272a', color: '#fff', padding: '6px 12px', borderRadius: '6px' }}
          />
          <button
            onClick={() => setRoomId(roomInput)}
            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            Join
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444', display: 'inline-block' }} />
          <span>{isConnected ? `Connected (${peers.length} online)` : 'Connecting...'}</span>
        </div>
      </div>

      {/* Live Chat Box */}
      <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '20px', height: '350px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {messages.length === 0 ? (
            <p style={{ color: '#71717a', fontSize: '14px', margin: 0, textAlign: 'center', marginTop: '140px' }}>
              No messages in room &quot;{roomId}&quot; yet. Send the first message!
            </p>
          ) : (
            messages.map((m, idx) => (
              <div key={idx} style={{ background: '#09090b', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                <span style={{ color: '#3b82f6', fontWeight: '700' }}>{m.sender?.name || m.data?.senderName || 'Peer'}: </span>
                <span>{m.data?.text || JSON.stringify(m.data)}</span>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a realtime message..."
            disabled={!isConnected}
            style={{ flex: 1, background: '#09090b', border: '1px solid #27272a', color: '#fff', padding: '10px', borderRadius: '6px' }}
          />
          <button
            type="submit"
            disabled={!isConnected}
            style={{ background: '#10b981', color: '#000', border: 'none', padding: '0 20px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
          >
            Broadcast
          </button>
        </form>
      </div>
    </div>
  );
}
