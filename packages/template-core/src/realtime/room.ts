// ── SparrowBase Realtime Room (Cloudflare Durable Object) ──
// Manages real-time WebSocket connections, peer presence, and event broadcasting.

export interface PeerInfo {
  userId: string;
  name?: string;
  avatarUrl?: string;
}

export class RealtimeRoom {
  state: any;
  env: any;
  sessions: Map<WebSocket, PeerInfo>;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Only allow WebSocket upgrade requests
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept WebSocket connection on server end
    server.accept();

    const userId = url.searchParams.get('userId') || `user_${crypto.randomUUID().slice(0, 6)}`;
    const userName = url.searchParams.get('name') || 'Anonymous';
    const peer: PeerInfo = { userId, name: userName };

    this.sessions.set(server, peer);

    // Notify others that a peer joined
    this.broadcast({
      type: 'peer_joined',
      peer,
      onlineCount: this.sessions.size,
      timestamp: Date.now(),
    }, server);

    // Send initial state & peer list to the newly connected client
    server.send(
      JSON.stringify({
        type: 'room_state',
        peers: Array.from(this.sessions.values()),
        onlineCount: this.sessions.size,
      })
    );

    server.addEventListener('message', (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : {};
        // Broadcast custom user messages to all peers in the room
        this.broadcast({
          type: 'message',
          sender: peer,
          data,
          timestamp: Date.now(),
        });
      } catch (err) {
        // Ignore unparseable frames
      }
    });

    const closeHandler = () => {
      this.sessions.delete(server);
      this.broadcast({
        type: 'peer_left',
        peer,
        onlineCount: this.sessions.size,
        timestamp: Date.now(),
      });
    };

    server.addEventListener('close', closeHandler);
    server.addEventListener('error', closeHandler);

    return new Response(null, { status: 101, webSocket: client });
  }

  broadcast(message: any, excludeWs?: WebSocket) {
    const payload = JSON.stringify(message);
    for (const [ws] of this.sessions.entries()) {
      if (ws !== excludeWs) {
        try {
          ws.send(payload);
        } catch {
          this.sessions.delete(ws);
        }
      }
    }
  }
}
