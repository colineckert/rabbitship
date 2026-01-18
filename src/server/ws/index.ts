import { WebSocketServer, WebSocket } from "ws";
import { getConfirmChannel } from "../rabbit/connection";
import { EXCHANGE, ROUTING_KEY, EVENT_TO_ROUTING } from "../rabbit/constants";
import { publishMsgPack } from "../rabbit/publish";
import { EVENT_TYPE } from "../../game/types";
import {
  isCreateGamePayload,
  isJoinPayload,
  isMovePayload,
  isPlaceShipPayload,
} from "./utils";

type WebSocketWithId = WebSocket & { id?: string };
type WsPayload = {
  type: string;
  [key: string]: unknown;
};

let wss: WebSocketServer | null = null;

// Server-side mapping of wsId -> gameId (set on join event).
// Prefer over trusting client-sent gameId for ownership.
const wsToGame = new Map<string, string>();

const handlers: Record<
  string,
  (ws: WebSocketWithId, data: WsPayload) => Promise<void>
> = {
  [EVENT_TYPE.CREATE_GAME]: async (ws, data) => {
    if (!data || !isCreateGamePayload(data)) {
      ws.send(JSON.stringify({ ok: false, error: "invalid create payload" }));
      return;
    }

    const resolvedWsId = typeof data.wsId === "string" ? data.wsId : ws.id;
    if (!resolvedWsId) {
      ws.send(JSON.stringify({ ok: false, error: "missing ws identity" }));
      return;
    }

    try {
      const ch = await getConfirmChannel();
      await publishMsgPack(
        ch,
        EXCHANGE.GAME_EVENTS,
        EVENT_TO_ROUTING[EVENT_TYPE.CREATE_GAME] ?? ROUTING_KEY.CREATE_GAME,
        {
          type: EVENT_TYPE.CREATE_GAME,
          player: data.player,
          wsId: resolvedWsId,
          mode: data.mode ?? "multiplayer",
          from: "ws",
          ts: Date.now(),
        },
      );
      ws.send(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error("WS publish error (create):", err);
      ws.send(JSON.stringify({ ok: false, error: String(err) }));
    }
  },

  [EVENT_TYPE.JOIN]: async (ws, data) => {
    if (!data || !isJoinPayload(data)) {
      ws.send(JSON.stringify({ ok: false, error: "invalid join payload" }));
      return;
    }

    const resolvedWsId = typeof data.wsId === "string" ? data.wsId : ws.id;
    if (!resolvedWsId) {
      ws.send(JSON.stringify({ ok: false, error: "missing ws identity" }));
      return;
    }

    wsToGame.set(resolvedWsId, data.gameId);
    try {
      const ch = await getConfirmChannel();
      await publishMsgPack(
        ch,
        EXCHANGE.GAME_EVENTS,
        EVENT_TO_ROUTING[EVENT_TYPE.JOIN] ?? ROUTING_KEY.GAME_JOIN,
        {
          type: EVENT_TYPE.JOIN,
          gameId: data.gameId,
          player: data.player,
          wsId: resolvedWsId,
          from: "ws",
          ts: Date.now(),
        },
      );
      ws.send(JSON.stringify({ ok: true, wsToGame }));
    } catch (err) {
      console.error("WS publish error (join):", err);
      ws.send(JSON.stringify({ ok: false, error: String(err) }));
    }
  },

  [EVENT_TYPE.PLACE_SHIP]: async (ws, data) => {
    if (!isPlaceShipPayload(data)) {
      ws.send(JSON.stringify({ ok: false, error: "invalid place payload" }));
      return;
    }

    const resolvedWsId = typeof data.wsId === "string" ? data.wsId : ws.id;
    const gameId =
      (resolvedWsId ? wsToGame.get(resolvedWsId) : undefined) ??
      (typeof data.gameId === "string" ? data.gameId : undefined);
    if (!gameId) {
      ws.send(JSON.stringify({ ok: false, error: "no gameId" }));
      return;
    }

    try {
      const ch = await getConfirmChannel();
      await publishMsgPack(
        ch,
        EXCHANGE.GAME_EVENTS,
        EVENT_TO_ROUTING[EVENT_TYPE.PLACE_SHIP] ?? ROUTING_KEY.PLACE_SHIP,
        {
          type: EVENT_TYPE.PLACE_SHIP,
          gameId,
          player: data.player,
          wsId: resolvedWsId,
          ship: data.ship,
          x: data.x,
          y: data.y,
          dir: data.dir,
          from: "ws",
          ts: Date.now(),
        },
      );
      ws.send(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error("WS publish error (place):", err);
      ws.send(JSON.stringify({ ok: false, error: String(err) }));
    }
  },

  [EVENT_TYPE.MOVE]: async (ws, data) => {
    if (!isMovePayload(data)) {
      ws.send(JSON.stringify({ ok: false, error: "invalid move payload" }));
      return;
    }

    const resolvedWsId = typeof data.wsId === "string" ? data.wsId : ws.id;
    const gameId =
      (resolvedWsId ? wsToGame.get(resolvedWsId) : undefined) ?? data.gameId;
    if (!gameId) {
      ws.send(JSON.stringify({ ok: false, error: "no gameId" }));
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
          wsId: resolvedWsId,
          x: data.x,
          y: data.y,
          from: "ws",
          ts: Date.now(),
        },
      );
      ws.send(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error("WS publish error:", err);
      ws.send(JSON.stringify({ ok: false, error: String(err) }));
    }
  },
};

// Broadcast an authoritative event (from workers) to connected WS clients.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function broadcastEvent(event: any) {
  if (!wss) return;

  if (
    event?.type === EVENT_TYPE.GAME_CREATED &&
    event.gameId &&
    event.players
  ) {
    const { gameId, players } = event as {
      gameId: string;
      players: { p1: string | null; p2: string | null | "ai" };
    };
    if (players.p1 && typeof players.p1 === "string")
      wsToGame.set(players.p1, gameId);
    if (players.p2 && typeof players.p2 === "string")
      wsToGame.set(players.p2, gameId);
  }

  const payload = JSON.stringify(event);
  for (const client of wss.clients) {
    const c = client as WebSocketWithId;

    if (!c || c.readyState !== WebSocket.OPEN) continue;

    try {
      // deliver only to clients that are mapped to this game
      if (event && typeof event.gameId === "string") {
        const mapped = c.id ? wsToGame.get(c.id) : undefined;
        if (mapped === event.gameId) {
          c.send(payload);
        }
      } else {
        // fallback: broadcast to all
        c.send(payload);
      }
    } catch {
      // ignore send errors per-client
    }
  }
}

export async function startWsServer(port = 8080) {
  if (wss) return;
  wss = new WebSocketServer({ port });

  wss.on("connection", (ws: WebSocketWithId) => {
    if (!ws.id) {
      ws.id = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    }

    console.log("WS client connected");
    ws.send(
      JSON.stringify({ type: "welcome", message: "Connected!", wsId: ws.id }),
    );

    // Handle incoming messages from clients
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ws.on("message", async (raw: any) => {
      let data = {} as WsPayload;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return; // ignore invalid JSON
      }

      const handler = handlers[data?.type];
      if (!handler) {
        ws.send(JSON.stringify({ ok: false, error: "unknown type" }));
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
