/* eslint-disable @typescript-eslint/no-explicit-any */
import { decode } from "@msgpack/msgpack";
import type amqp from "amqplib";
import { getConnection, getConfirmChannel } from "./connection";
import { QUEUE } from "./constants";
import { EVENT_TYPE } from "../../game/types";
import { createMoveHandler } from "../worker/moveWorker";
import {
  createJoinGameHandler,
  createCreateGameHandler,
} from "../worker/gameWorker";
import { GameEngine } from "../../game/engine";
import { subscribeChannel, AckType } from "./subscribe";
import { startBroadcaster } from "./broadcaster";
import { createPlacementHandler } from "../worker/placementWorker";

let channel: amqp.Channel | null = null;

type Unsubscribe = () => Promise<void>;
const unsubscribers: Unsubscribe[] = [];

export async function startConsumers() {
  const conn = await getConnection();
  channel = await conn.createChannel();

  // Fetch one message at a time (preserve ordering per game)
  await channel.prefetch(1);

  // Create a single GameEngine
  const engine = new GameEngine();
  // Create a single confirm channel for publishing from handlers
  const confirmCh = await getConfirmChannel();
  // Create event handlers
  const createHandler = createCreateGameHandler(engine, confirmCh);
  const joinHandler = createJoinGameHandler(engine, confirmCh);
  const placeShipHandler = createPlacementHandler(engine, confirmCh);
  const moveHandler = createMoveHandler(engine, confirmCh);

  // subscribe debug queue
  unsubscribers.push(
    await subscribeChannel<any>(
      channel,
      QUEUE.DEBUG,
      async (data) => {
        console.log("\n[DEBUG]", JSON.stringify(data, null, 2));
        return AckType.Ack;
      },
      (b) => decode(b),
      1,
    ),
  );

  // subscribe game server queue
  unsubscribers.push(
    await subscribeChannel<any>(
      channel,
      QUEUE.GAME_SERVER,
      async (data) => {
        if (!data || typeof data.type !== "string") {
          return AckType.NackDiscard;
        }

        if (data.type === EVENT_TYPE.CREATE_GAME) {
          if (!createHandler) return AckType.NackDiscard;
          return createHandler(data);
        }
        if (data.type === EVENT_TYPE.JOIN) {
          if (!joinHandler) return AckType.NackDiscard;
          return joinHandler(data);
        }
        if (data.type === EVENT_TYPE.PLACE_SHIP) {
          if (!placeShipHandler) return AckType.NackDiscard;
          return placeShipHandler(data);
        }
        if (data.type === EVENT_TYPE.MOVE) {
          if (!moveHandler) return AckType.NackDiscard;
          return moveHandler(data);
        }
        if (data.type === EVENT_TYPE.GAME_OVER) {
          // GAME_OVER events are just broadcast events, no processing needed
          return AckType.Ack;
        }
        return AckType.Ack;
      },
      (b) => decode(b),
      1,
    ),
  );

  // start broadcaster (binds to game.*) to forward authoritative events to WS clients
  unsubscribers.push(await startBroadcaster(channel));

  console.log("\nALL SUBSCRIPTIONS ACTIVE");
  console.log("   Ready for real-time game events!\n");

  return channel;
}

export async function stopConsumers() {
  for (const unsubscribe of unsubscribers) {
    await unsubscribe();
  }

  if (channel) {
    await channel.close();
    channel = null;
  }
  console.log("All consumer stopped gracefully.");
}
