/* eslint-disable @typescript-eslint/no-explicit-any */
import { decode } from '@msgpack/msgpack';
import type amqp from 'amqplib';
import { getConnection } from './connection';
import { QUEUE } from './constants';
import { EVENT_TYPE, type MoveEvent } from '../../game/types';
import { createMoveHandler } from '../worker/moveWorker';
import { GameEngine } from '../../game/engine';
import { subscribeChannel, AckType } from './subscribe';

type Unsubscribe = () => Promise<void>;

let channel: amqp.Channel | null = null;
const unsubscribers: Unsubscribe[] = [];
let moveHandler: ((payload: MoveEvent) => Promise<AckType>) | null = null;

export async function startConsumers() {
  const conn = await getConnection();
  channel = await conn.createChannel();

  // Fetch one message at a time (preserve ordering per game)
  await channel.prefetch(1);

  // Create a single GameEngine instance and move handler (DI)
  const engine = new GameEngine();
  moveHandler = createMoveHandler(engine);

  // subscribe debug queue
  unsubscribers.push(
    await subscribeChannel<any>(
      channel,
      QUEUE.DEBUG,
      async (data) => {
        console.log('\n[DEBUG]', JSON.stringify(data, null, 2));
        return AckType.Ack;
      },
      (b) => decode(b),
      1
    )
  );

  // subscribe game server queue
  unsubscribers.push(
    await subscribeChannel<any>(
      channel,
      QUEUE.GAME_SERVER,
      async (data) => {
        if (data && data.type === EVENT_TYPE.MOVE) {
          if (!moveHandler) return AckType.NackDiscard;
          return moveHandler(data);
        }
        console.log('\n[GAME_SERVER]', JSON.stringify(data, null, 2));
        return AckType.Ack;
      },
      (b) => decode(b),
      1
    )
  );

  console.log('\nALL SUBSCRIPTIONS ACTIVE');
  console.log('   Ready for real-time game events!\n');

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
  console.log('All consumer stopped gracefully.');
}
