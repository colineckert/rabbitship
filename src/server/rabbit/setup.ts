import { getConnection } from "./connection";
import { EXCHANGE, QUEUE, ROUTING_KEY } from "./constants";

export async function initTopology() {
  try {
    const conn = await getConnection();
    const ch = await conn.createChannel();

    // Exchanges
    await ch.assertExchange(EXCHANGE.GAME_EVENTS, "topic", { durable: true });
    await ch.assertExchange(EXCHANGE.DEAD_LETTER, "direct", { durable: true });

    // Queues
    await ch.assertQueue(QUEUE.GAME_SERVER, {
      durable: true,
      exclusive: false,
      autoDelete: false,
    });

    await ch.assertQueue(QUEUE.DEBUG, {
      durable: true,
      exclusive: false,
      autoDelete: false,
      arguments: {
        "x-message-ttl": 604800000, // 7 days
        "x-max-length": 1000,
        "x-dead-letter-exchange": EXCHANGE.DEAD_LETTER,
      },
    });

    await ch.assertQueue(QUEUE.DLQ, {
      durable: true,
    });

    // Bindings
    await ch.bindQueue(QUEUE.DEBUG, EXCHANGE.GAME_EVENTS, ROUTING_KEY.TEST_ANY);
    await ch.bindQueue(
      QUEUE.GAME_SERVER,
      EXCHANGE.GAME_EVENTS,
      ROUTING_KEY.GAME_ANY,
    );
    await ch.bindQueue(QUEUE.DLQ, EXCHANGE.DEAD_LETTER, ROUTING_KEY.ERROR_ANY);

    console.log("RabbitMQ topology READY");
    console.log(`  → ${EXCHANGE.GAME_EVENTS}`);
    console.log(`  → ${QUEUE.DEBUG} ← ${ROUTING_KEY.TEST_ANY}`);
    console.log(`  → ${QUEUE.GAME_SERVER} ← ${ROUTING_KEY.GAME_ANY}`);

    return ch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Topology setup failed:", err.message);
    throw err;
  }
}
