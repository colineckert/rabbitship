import type amqp from 'amqplib';
import { decode } from '@msgpack/msgpack';
import { EXCHANGE, ROUTING_KEY } from './constants';
import { broadcastEvent } from '../ws';

// Start a broadcaster that binds an exclusive queue to game.* and forwards
// decoded events to the WS layer via `broadcastEvent`.
export async function startBroadcaster(channel: amqp.Channel) {
  // create exclusive queue
  const q = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE.GAME_EVENTS, ROUTING_KEY.GAME_ANY);

  const consumer = await channel.consume(
    q.queue,
    async (msg) => {
      if (!msg) return;
      let data: unknown = null;
      try {
        data = decode(msg.content);
      } catch (err) {
        console.error('broadcaster: could not decode message', err);
        // malformed — ack to drop
        channel.ack(msg);
        return;
      }

      try {
        // best-effort: forward to WS layer
        try {
          broadcastEvent(data);
        } catch (err) {
          console.error('broadcaster: failed to broadcast event', err);
        }
        channel.ack(msg);
      } catch (err) {
        // on unexpected error, nack without requeue to avoid loops
        console.error('broadcaster: unexpected error', err);
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );

  return async function stop() {
    await channel.cancel(consumer.consumerTag);
    await channel.deleteQueue(q.queue);
  };
}
