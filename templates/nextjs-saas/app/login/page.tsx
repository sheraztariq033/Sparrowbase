'use client';

import React, { useState } from 'react';
import { useSession } from '@sparrowbase/react';

export default function LoginPage() {
  const { user, isAuthenticated, signIn, signUp, signOut, isLoading } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (isSignUp) {
        await signUp({ email, password, name });
      } else {
        await signIn({ email, password });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '100px' }}>Loading session...</div>;
  }

  if (isAuthenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '32px', background: '#18181b', borderRadius: '12px', textAlign: 'center' }}>
        <h2>Welcome, {user?.name || user?.email}!</h2>
        <p style={{ color: '#a1a1aa' }}>You are securely authenticated via Better-Auth & D1.</p>
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <a href="/dashboard" style={{ background: '#10b981', color: '#000', padding: '10px 20px', borderRadius: '6px', fontWeight: '700', textDecoration: 'none' }}>
            Go to Dashboard
          </a>
          <button onClick={signOut} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '32px', background: '#18181b', borderRadius: '12px', border: '1px solid #27272a' }}>
      <h2 style={{ marginTop: 0, textAlign: 'center' }}>{isSignUp ? 'Create Account' : 'Sign In'}</h2>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isSignUp && (
          <div>
            <label style={{ fontSize: '13px', color: '#a1a1aa' }}>Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', background: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
            />
          </div>
        )}

        <div>
          <label style={{ fontSize: '13px', color: '#a1a1aa' }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', background: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '13px', color: '#a1a1aa' }}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', background: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', marginTop: '4px' }}
          />
        </div>

        <button type="submit" style={{ marginTop: '12px', background: '#10b981', color: '#000', padding: '12px', borderRadius: '6px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>
          {isSignUp ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '14px', color: '#a1a1aa', marginTop: '20px' }}>
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: '700' }}>
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </div>
  );
}
