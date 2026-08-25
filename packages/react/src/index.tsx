import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createSparrowClient, SparrowClient, ChatMessage } from '@sparrowbase/client';

const SparrowContext = createContext<SparrowClient | null>(null);

export interface SparrowProviderProps {
  client?: SparrowClient;
  baseUrl?: string;
  children: React.ReactNode;
}

export function SparrowProvider({ client, baseUrl, children }: SparrowProviderProps) {
  const [sparrowClient] = useState<SparrowClient>(() => {
    if (client) return client;
    return createSparrowClient({ baseUrl });
  });

  return (
    <SparrowContext.Provider value={sparrowClient}>
      {children}
    </SparrowContext.Provider>
  );
}

export function useSparrowClient(): SparrowClient {
  const client = useContext(SparrowContext);
  if (!client) {
    throw new Error('useSparrowClient must be used within a <SparrowProvider>');
  }
  return client;
}

export function useSession() {
  const client = useSparrowClient();
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await client.auth.getSession();
      setSession(data?.session || null);
      setUser(data?.user || null);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const signIn = async (credentials: { email: string; password: string }) => {
    const res = await client.auth.signIn(credentials);
    await refreshSession();
    return res;
  };

  const signUp = async (data: { email: string; password: string; name: string }) => {
    const res = await client.auth.signUp(data);
    await refreshSession();
    return res;
  };

  const signOut = async () => {
    await client.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return {
    session,
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };
}

export function useFileUpload() {
  const client = useSparrowClient();
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);

  const upload = async (file: File, userId: string, organizationId?: string) => {
    try {
      setIsUploading(true);
      setError(null);
      const result = await client.uploadFile(file, userId, organizationId);
      setUploadResult(result);
      return result;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    upload,
    isUploading,
    uploadResult,
    error,
  };
}

export function useAIChat(initialMessages: ChatMessage[] = []) {
  const client = useSparrowClient();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = async (userPrompt?: string) => {
    const promptText = userPrompt || input;
    if (!promptText.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: promptText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      await client.ai.streamChat({
        messages: updatedMessages,
        onChunk: (token: string) => {
          setMessages((prev: ChatMessage[]) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              last.content += token;
            }
            return next;
          });
        },
      });
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    error,
    setMessages,
  };
}

export interface RealtimePeer {
  userId: string;
  name?: string;
}

export interface RealtimeMessage {
  type: string;
  sender?: RealtimePeer;
  data?: any;
  timestamp?: number;
}

export function useRealtimeChannel(roomId: string, user?: { userId?: string; name?: string }) {
  const client = useSparrowClient();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [peers, setPeers] = useState<RealtimePeer[]>([]);
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const wsUrl = client.realtime.getWsUrl(roomId, user);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'room_state') {
          setPeers(msg.peers || []);
        } else if (msg.type === 'peer_joined') {
          setPeers((prev) => [...prev.filter((p) => p.userId !== msg.peer.userId), msg.peer]);
        } else if (msg.type === 'peer_left') {
          setPeers((prev) => prev.filter((p) => p.userId !== msg.peer.userId));
        } else if (msg.type === 'message') {
          setMessages((prev) => [...prev, msg]);
        }
      } catch {
        // Ignore unparseable
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [client, roomId, user?.userId, user?.name]);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return {
    isConnected,
    peers,
    messages,
    sendMessage,
  };
}
