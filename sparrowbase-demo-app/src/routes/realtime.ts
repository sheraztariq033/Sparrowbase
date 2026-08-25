import { Hono } from 'hono';
import { EnvBindings } from '../auth';

export interface RealtimeEnvBindings extends EnvBindings {
  REALTIME_ROOM?: any;
}

export const realtimeRouter = new Hono<{ Bindings: RealtimeEnvBindings }>();

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

  const id = namespace.idFromName(roomId);
  const roomObj = namespace.get(id);

  return roomObj.fetch(c.req.raw);
});
