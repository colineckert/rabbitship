import amqp from "amqplib";

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@rabbitmq:5672/";

let conn: amqp.ChannelModel | null = null;
let isConnecting = false;

export async function getRabbitMQConnection(): Promise<amqp.ChannelModel> {
  if (conn) return conn;

  if (isConnecting) {
    await new Promise((resolve) => {
      const checkConnection = setInterval(() => {
        if (conn) {
          clearInterval(checkConnection);
          resolve(null);
        }
      }, 100);
    });
    return getRabbitMQConnection();
  }

  isConnecting = true;
  console.log("Connecting to RabbitMQ...");

  try {
    conn = await amqp.connect(RABBITMQ_URL, {
      heartbeat: 60,
      reconnectTimeInSeconds: 5,
    });

    conn.on("close", () => {
      console.error("RabbitMQ conn closed. Reconnecting...");
      conn = null;
    });

    conn.on("error", (err) => {
      console.error("RabbitMQ error:", err.message);
      conn = null;
    });

    console.log("Connected to RabbitMQ!");
    return conn;
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error);
    throw error;
  } finally {
    isConnecting = false;
  }
}
