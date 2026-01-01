import type amqp from 'amqplib';

export const AckType = {
  Ack: 'Ack',
  NackDiscard: 'NackDiscard',
  NackRequeue: 'NackRequeue',
} as const;

export type AckType = (typeof AckType)[keyof typeof AckType];

export type Unsubscribe = () => Promise<void>;

// Generic subscribe helper that centralizes decode/ack logic.
export async function subscribeChannel<T>(
  ch: amqp.Channel,
  queue: string,
  handler: (
    data: T,
    meta: { routingKey: string; properties: amqp.MessageProperties }
  ) => Promise<AckType> | AckType,
  unmarshaller: (b: Buffer) => T,
  prefetch = 1
): Promise<Unsubscribe> {
  await ch.prefetch(prefetch);

  const { consumerTag } = await ch.consume(queue, async (msg) => {
    if (!msg) return;

    let data: T;
    try {
      data = unmarshaller(msg.content);
    } catch (err) {
      console.error('Could not unmarshal message:', err);
      // can't decode — discard to DLQ
      ch.nack(msg, false, false);
      return;
    }

    try {
      const result = await handler(data, {
        routingKey: msg.fields.routingKey,
        properties: msg.properties,
      });
      switch (result) {
        case AckType.Ack:
          ch.ack(msg);
          break;
        case AckType.NackDiscard:
          ch.nack(msg, false, false);
          break;
        case AckType.NackRequeue:
          ch.nack(msg, false, true);
          break;
        default:
          // unreachable
          ch.nack(msg, false, false);
          break;
      }
    } catch (err) {
      console.error('Error handling message:', err);
      ch.nack(msg, false, false);
      return;
    }
  });

  return async () => {
    await ch.cancel(consumerTag);
  };
}
