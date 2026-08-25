import { Hono } from 'hono';
import { EnvBindings } from '../auth';

export interface RealtimeEnvBindings extends EnvBindings {
  REALTIME_ROOM?: any; // Cloudflare Durable Object Namespace
}

export const realtimeRouter = new Hono<{ Bindings: RealtimeEnvBindings }>();

// WebSocket connection router for Realtime Rooms
realtimeRouter.get('/ws/:roomId', async (c) => {
  const roomId = c.req.param('roomId');
  const namespace = c.env.REALTIME_ROOM;

  if (!namespace) {
    return c.json({
      error: 'REALTIME_ROOM Durable Object binding not configured in wrangler.toml',
      simulated: true,
      roomId,
    });
  }

  // Get or create the unique Durable Object ID for this roomId
  const id = namespace.idFromName(roomId);
  const roomObj = namespace.get(id);

  // Forward the WebSocket request directly into the Durable Object
  return roomObj.fetch(c.req.raw);
});
