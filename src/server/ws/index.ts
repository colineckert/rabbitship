import { WebSocketServer, WebSocket } from 'ws';
import { getConfirmChannel } from '../rabbit/connection';
import { EXCHANGE, ROUTING_KEY, EVENT_TO_ROUTING } from '../rabbit/constants';
import { publishMsgPack } from '../rabbit/publish';
import { EVENT_TYPE } from '../../game/types';

type WebSocketWithId = WebSocket & { id?: string };
type WsPayload = {
  type: string;
  [key: string]: unknown;
};

let wss: WebSocketServer | null = null;

// Server-side mapping of wsId -> gameId (set on join event).
// Prefer over trusting client-sent gameId for ownership.
const wsToGame = new Map<string, string>();

function isMovePayload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any
): obj is { player: string; x: number; y: number } {
  return (
    obj &&
    typeof obj.player === 'string' &&
    typeof obj.x === 'number' &&
    typeof obj.y === 'number'
  );
}

const handlers: Record<
  string,
  (ws: WebSocketWithId, data: WsPayload) => Promise<void>
> = {
  [EVENT_TYPE.CREATE_GAME]: async (ws, data) => {
    if (
      !data ||
      typeof data.wsId !== 'string' ||
      typeof data.player !== 'string'
    ) {
      ws.send(JSON.stringify({ ok: false, error: 'invalid create payload' }));
      return;
    }

    try {
      const ch = await getConfirmChannel();
      await publishMsgPack(
        ch,
        EXCHANGE.GAME_EVENTS,
        EVENT_TO_ROUTING[EVENT_TYPE.CREATE_GAME] ?? ROUTING_KEY.GAME_CREATED,
        {
          type: EVENT_TYPE.CREATE_GAME,
          player: data.player,
          wsId: data.wsId,
          mode: data.mode ?? 'multiplayer',
          from: 'ws',
          ts: Date.now(),
        }
      );
      ws.send(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error('WS publish error (create):', err);
      ws.send(JSON.stringify({ ok: false, error: String(err) }));
    }
  },

  [EVENT_TYPE.JOIN]: async (ws, data) => {
    if (
      !data ||
      typeof data.wsId !== 'string' ||
      typeof data.gameId !== 'string'
    ) {
      ws.send(JSON.stringify({ ok: false, error: 'invalid join payload' }));
      return;
    }
    wsToGame.set(data.wsId, data.gameId);
    ws.send(JSON.stringify({ ok: true }));
  },

  [EVENT_TYPE.MOVE]: async (ws, data) => {
    if (!isMovePayload(data)) {
      ws.send(JSON.stringify({ ok: false, error: 'invalid move payload' }));
      return;
    }

    const gameId =
      (typeof data.wsId === 'string' ? wsToGame.get(data.wsId) : undefined) ??
      data.gameId;
    if (!gameId) {
      ws.send(JSON.stringify({ ok: false, error: 'no gameId' }));
      return;
    }

    try {
      const ch = await getConfirmChannel();
      await publishMsgPack(
        ch,
        EXCHANGE.GAME_EVENTS,
        EVENT_TO_ROUTING[EVENT_TYPE.MOVE] ?? ROUTING_KEY.GAME_MOVE,
        {
          type: EVENT_TYPE.MOVE,
          gameId,
          player: data.player,
          x: data.x,
          y: data.y,
          from: 'ws',
          ts: Date.now(),
        }
      );
      ws.send(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error('WS publish error:', err);
      ws.send(JSON.stringify({ ok: false, error: String(err) }));
    }
  },
};

export async function startWsServer(port = 8080) {
  if (wss) return;
  wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WebSocketWithId) => {
    if (!ws.id) {
      ws.id = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    }

    console.log('WS client connected');
    ws.send(
      JSON.stringify({ type: 'welcome', message: 'Connected!', wsId: ws.id })
    );

    // Handle incoming messages from clients
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ws.on('message', async (raw: any) => {
      let data = {} as WsPayload;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return; // ignore invalid JSON
      }

      const handler = handlers[data?.type];
      if (!handler) {
        ws.send(JSON.stringify({ ok: false, error: 'unknown type' }));
        return;
      }

      if (!data.wsId && ws.id) data.wsId = ws.id;

      await handler(ws, data);
    });
  });

  console.log(`WS → ws://localhost:${port}`);
}

export async function stopWsServer() {
  if (!wss) return;
  return new Promise<void>((res) => {
    wss?.close(() => {
      wss = null;
      wsToGame.clear();
      res();
    });
  });
}
