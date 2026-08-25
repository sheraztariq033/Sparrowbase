'use client';

import React from 'react';
import { SparrowProvider } from '@sparrowbase/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const apiUrl = process.env.NEXT_PUBLIC_SPARROWBASE_URL || 'http://localhost:8787';

  return (
    <html lang="en">
      <head>
        <title>SparrowBase SaaS Starter</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, background: '#09090b', color: '#fafafa', fontFamily: 'sans-serif' }}>
        <SparrowProvider baseUrl={apiUrl}>
          {children}
        </SparrowProvider>
      </body>
    </html>
  );
}
