import { decode } from "@msgpack/msgpack";
import type amqp from "amqplib";
import { getConnection } from "./connection";
import { QUEUE } from "./constants";

type Unsubscribe = () => Promise<void>;

let channel: amqp.Channel | null = null;
const unsubscribers: Unsubscribe[] = [];

async function subscribe(
  channel: amqp.Channel,
  queue: string,
): Promise<Unsubscribe> {
  const { consumerTag } = await channel.consume(
    queue,
    (msg) => {
      if (!msg) return;

      try {
        const payload = decode(msg.content);
        const time = new Date(msg.properties.timestamp * 1000).toISOString();

        console.log(`\n[EVENT] ${queue}`);
        console.log(`   Time: ${time}`);
        console.log(`   Key: ${msg.fields.routingKey}`);
        console.log(`   Data:`, JSON.stringify(payload, null, 2));

        channel.ack(msg);
      } catch (err) {
        console.log(`[FAIL] ${queue}:`, err);
        channel.nack(msg, false, false); // → dlq
      }
    },
    { noAck: false, consumerTag: `${queue}-consumer` },
  );

  return async () => {
    await channel.cancel(consumerTag);
    console.log(`Unsubscribed from ${queue}`);
  };
}

export async function startConsumers() {
  const conn = await getConnection();
  channel = await conn.createChannel();

  // Fetch one message at a time
  await channel.prefetch(1);

  unsubscribers.push(await subscribe(channel, QUEUE.DEBUG));
  unsubscribers.push(await subscribe(channel, QUEUE.GAME_SERVER));

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
