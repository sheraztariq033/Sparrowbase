'use client';

import React from 'react';

export default function HomePage() {
  return (
    <main style={{ maxWidth: '900px', margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '48px', fontWeight: '800', margin: '0 0 16px', background: 'linear-gradient(135deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        SparrowBase SaaS Starter
      </h1>
      <p style={{ fontSize: '20px', color: '#a1a1aa', maxWidth: '600px', margin: '0 auto 40px', lineHeight: '1.6' }}>
        Production-ready full stack SaaS powered by Next.js 15, Better-Auth, Cloudflare D1, R2 Object Storage, and Workers AI.
      </p>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <a href="/login" style={{ background: '#10b981', color: '#000', padding: '14px 28px', borderRadius: '8px', fontWeight: '700', textDecoration: 'none' }}>
          Get Started / Sign In →
        </a>
        <a href="/dashboard" style={{ background: '#27272a', color: '#fff', padding: '14px 28px', borderRadius: '8px', fontWeight: '700', textDecoration: 'none' }}>
          Open Dashboard
        </a>
        <a href="/realtime" style={{ background: '#3b82f6', color: '#fff', padding: '14px 28px', borderRadius: '8px', fontWeight: '700', textDecoration: 'none' }}>
          Live Multiplayer Room
        </a>
      </div>
    </main>
  );
}
