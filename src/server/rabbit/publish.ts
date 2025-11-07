import { getRabbitMQConnection } from "./connection";
import { encode } from "@msgpack/msgpack";

export async function publishTest() {
  try {
    const conn = await getRabbitMQConnection();
    const channel = await conn.createConfirmChannel();

    await channel.assertExchange("game.events", "topic", { durable: true });

    const payload = encode({
      event: "test_event",
      timestamp: Date.now(),
      message: "RabbitShip is ALIVE!",
      from: "publishTest function",
      docker: "🐇🚢",
    });

    return new Promise<void>((resolve, reject) => {
      channel.publish(
        "game.events",
        "test.rabbitship",
        Buffer.from(payload),
        {
          contentType: "application/x-msgpack",
          persistent: true,
          messageId: crypto.randomUUID(),
          timestamp: Math.floor(Date.now() / 1000),
        },
        (err) => {
          if (err !== null) {
            reject(new Error("Message was NACKed by the broker"));
          } else {
            resolve();
          }
        },
      );
    });
  } catch (err) {
    console.error("Error in publishTest:", err);
  }
}
