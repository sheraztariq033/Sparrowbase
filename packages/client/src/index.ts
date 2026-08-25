export interface SparrowClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamChatOptions {
  messages: ChatMessage[];
  model?: string;
  max_tokens?: number;
  onChunk?: (token: string) => void;
}

export function createSparrowClient(options: SparrowClientOptions = {}) {
  const baseUrl = (options.baseUrl || 'https://api.sparrowbase.dev').replace(/\/$/, '');
  const customFetch = options.fetch || globalThis.fetch;

  return {
    baseUrl,

    // 1. Health Status Check
    async getHealth() {
      const res = await customFetch(`${baseUrl}/api/health`);
      if (!res.ok) throw new Error(`Health check failed (${res.status})`);
      return res.json();
    },

    // 2. Authentication Helpers (Better-Auth client adapter)
    auth: {
      async signIn(credentials: { email: string; password: string }) {
        const res = await customFetch(`${baseUrl}/api/auth/sign-in/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Sign in failed' }));
          throw new Error((err as any).message || 'Sign in failed');
        }
        return res.json();
      },

      async signUp(data: { email: string; password: string; name: string }) {
        const res = await customFetch(`${baseUrl}/api/auth/sign-up/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Sign up failed' }));
          throw new Error((err as any).message || 'Sign up failed');
        }
        return res.json();
      },

      async signOut() {
        const res = await customFetch(`${baseUrl}/api/auth/sign-out`, {
          method: 'POST',
        });
        return res.ok;
      },

      async getSession() {
        const res = await customFetch(`${baseUrl}/api/auth/get-session`);
        if (!res.ok) return null;
        return res.json();
      },
    },

    // 3. Direct R2 File Upload Helper
    async uploadFile(file: File, userId: string, organizationId?: string) {
      // Step A: Get presigned upload target metadata
      const metaRes = await customFetch(`${baseUrl}/api/storage/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          userId,
          organizationId,
        }),
      });

      if (!metaRes.ok) {
        const err = await metaRes.json().catch(() => ({ error: 'Upload metadata failed' }));
        throw new Error((err as any).error || 'Upload request rejected');
      }

      const meta = await metaRes.json();

      // Step B: Stream upload directly into R2
      const uploadRes = await customFetch(`${baseUrl}${meta.uploadUrl}`, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`R2 streaming upload failed (${uploadRes.status})`);
      }

      return {
        fileId: meta.fileId,
        r2Key: meta.r2Key,
        publicUrl: `${baseUrl}${meta.publicUrl}`,
      };
    },

    // 4. AI RAG Vector Embed, Search & Streaming Helpers
    ai: {
      async embed(text: string, metadata?: Record<string, any>) {
        const res = await customFetch(`${baseUrl}/api/ai/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, metadata }),
        });
        return res.json();
      },

      async search(query: string, topK = 5) {
        const res = await customFetch(`${baseUrl}/api/ai/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, topK }),
        });
        return res.json();
      },

      /**
       * Stream LLM chat responses token-by-token (Server-Sent Events)
       */
      async streamChat(options: StreamChatOptions): Promise<string> {
        const res = await customFetch(`${baseUrl}/api/ai/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: options.messages,
            model: options.model,
            max_tokens: options.max_tokens,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Stream request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                const token = parsed.response || parsed.token || '';
                fullText += token;
                if (options.onChunk && token) {
                  options.onChunk(token);
                }
              } catch {
                // Ignore SSE keep-alive comments or non-JSON chunks
              }
            }
          }
        }

        return fullText;
      },
    },

    // 5. Realtime WebSocket Helpers
    realtime: {
      getWsUrl(roomId: string, user?: { userId?: string; name?: string }) {
        const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
        const host = baseUrl.replace(/^https?:\/\//, '');
        const params = new URLSearchParams();
        if (user?.userId) params.set('userId', user.userId);
        if (user?.name) params.set('name', user.name);
        const query = params.toString() ? `?${params.toString()}` : '';
        return `${wsProtocol}://${host}/api/realtime/ws/${roomId}${query}`;
      },
    },
  };
}

export type SparrowClient = ReturnType<typeof createSparrowClient>;
