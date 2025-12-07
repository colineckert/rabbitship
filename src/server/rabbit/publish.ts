import { encode } from "@msgpack/msgpack";
import { getConnection } from "./connection";
import { EXCHANGE, ROUTING_KEY } from "./constants";
import type { ConfirmChannel } from "amqplib";

export async function publishTest() {
  try {
    const conn = await getConnection();
    const channel = await conn.createConfirmChannel();

    const payload = encode({
      type: "test",
      message: "RabbitShip is ALIVE!",
      timestamp: Date.now(),
      from: "publish.ts",
      version: "1.0",
    });

    return new Promise<void>((resolve, reject) => {
      channel.publish(
        EXCHANGE.GAME_EVENTS,
        ROUTING_KEY.TEST_PUBLISH,
        Buffer.from(payload),
        {
          persistent: true,
          messageId: crypto.randomUUID(),
          timestamp: Math.floor(Date.now() / 1000),
          contentType: "application/msgpack",
          contentEncoding: "binary",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: any) => {
          if (err) {
            console.error("Publish failed:", err);
            reject(err);
          } else {
            console.log(`PUBLISHED → ${ROUTING_KEY.TEST_PUBLISH}`);
            resolve();
          }
        },
      );
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("publishTest failed:", err.message);
  }
}

export function publishMsgPack<T>(
  ch: ConfirmChannel,
  exchange: string,
  routingKey: string,
  value: T,
): Promise<void> {
  const buffer = Buffer.from(encode(value));

  return new Promise((resolve, reject) => {
    ch.publish(
      exchange,
      routingKey,
      buffer,
      { contentType: "application/x-msgpack" },
      (err) => {
        if (err !== null) {
          reject(new Error("Message was NACKed by the broker"));
        } else {
          resolve();
        }
      },
    );
  });
}
