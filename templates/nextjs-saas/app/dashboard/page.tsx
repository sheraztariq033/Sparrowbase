'use client';

import React from 'react';
import { useSession, useFileUpload, useAIChat } from '@sparrowbase/react';

export default function DashboardPage() {
  const { user, isAuthenticated, signOut, isLoading } = useSession();
  const { upload, isUploading, uploadResult, error: uploadError } = useFileUpload();
  const { messages, input, setInput, sendMessage, isLoading: isAiLoading } = useAIChat();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await upload(e.target.files[0], user?.id || 'demo_user');
    }
  };

  if (isLoading) return <div style={{ padding: '60px', textAlign: 'center' }}>Loading dashboard...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #27272a', paddingBottom: '20px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: '#a1a1aa', fontSize: '14px' }}>
            Logged in as: <strong>{user?.email || 'Guest User'}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="/realtime" style={{ background: '#3b82f6', color: '#fff', padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
            Realtime Room
          </a>
          {isAuthenticated && (
            <button onClick={signOut} style={{ background: '#27272a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
              Sign Out
            </button>
          )}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Storage Card */}
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ marginTop: 0 }}>📦 Direct Cloudflare R2 Upload</h3>
          <p style={{ color: '#a1a1aa', fontSize: '14px' }}>Stream files directly into your R2 bucket using presigned URLs.</p>

          <input
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
            style={{ marginTop: '12px', display: 'block', background: '#09090b', padding: '10px', borderRadius: '6px', width: '100%', boxSizing: 'border-box', border: '1px solid #27272a' }}
          />

          {isUploading && <p style={{ color: '#10b981', fontSize: '14px' }}>Uploading directly to R2...</p>}
          {uploadError && <p style={{ color: '#ef4444', fontSize: '14px' }}>Upload failed: {uploadError.message}</p>}
          {uploadResult && (
            <div style={{ marginTop: '16px', background: '#09090b', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
              <div><strong>Status:</strong> Uploaded successfully!</div>
              <div><strong>File ID:</strong> {uploadResult.fileId}</div>
              <a href={uploadResult.publicUrl} target="_blank" rel="noreferrer" style={{ color: '#10b981', display: 'inline-block', marginTop: '8px' }}>
                View uploaded file →
              </a>
            </div>
          )}
        </div>

        {/* AI Chat Card */}
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginTop: 0 }}>🤖 Workers AI Assistant</h3>
          <p style={{ color: '#a1a1aa', fontSize: '14px', margin: '0 0 12px' }}>Real-time token streaming with Llama 3 on Cloudflare Workers AI.</p>

          <div style={{ flex: 1, minHeight: '180px', maxHeight: '220px', overflowY: 'auto', background: '#09090b', border: '1px solid #27272a', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}>
            {messages.length === 0 ? (
              <p style={{ color: '#71717a', fontSize: '13px', margin: 0 }}>Ask the AI assistant anything...</p>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} style={{ marginBottom: '8px', fontSize: '13px', color: m.role === 'user' ? '#3b82f6' : '#10b981' }}>
                  <strong>{m.role === 'user' ? 'You' : 'AI'}:</strong> {m.content}
                </div>
              ))
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isAiLoading}
              style={{ flex: 1, background: '#09090b', border: '1px solid #27272a', color: '#fff', padding: '10px', borderRadius: '6px' }}
            />
            <button type="submit" disabled={isAiLoading} style={{ background: '#10b981', color: '#000', border: 'none', padding: '0 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>
              {isAiLoading ? '...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
