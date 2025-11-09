import { serve } from "bun";
import { WebSocketServer } from "ws";
import { getConnection } from "../rabbit/connection";
import { publishTest } from "../rabbit/publish";
import { startConsumers, stopConsumers } from "../rabbit/consume";
import { QUEUE } from "../rabbit/constants";
import { initTopology } from "../rabbit/setup";

const HTTP_PORT = 3000;
const WS_PORT = 8080;

async function startup() {
  console.log("Starting RabbitShip server...");
  await getConnection();
  await initTopology();
  await startConsumers();
}

startup().catch((err) => {
  console.error("Server startup failed:", err);
  process.exit(1);
});

serve({
  port: HTTP_PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }

    if (url.pathname === "/debug/rabbitmq") {
      try {
        await getConnection();
        return new Response("RabbitMQ: Connected", { status: 200 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        return new Response(`RabbitMQ: ${err.message}`, { status: 500 });
      }
    }

    if (url.pathname === "/debug/publish") {
      await publishTest();
      return new Response(`Test message sent → ${QUEUE.DEBUG}`, {
        status: 200,
      });
    }

    if (url.pathname === "/debug/clear") {
      const conn = await getConnection();
      const ch = await conn.createChannel();
      await ch.purgeQueue(QUEUE.DEBUG);
      await ch.close();
      return new Response(`${QUEUE.DEBUG} cleared`, { status: 200 });
    }

    // Serve React
    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file("./dist" + filePath);
    return new Response(
      (await file.exists()) ? file : Bun.file("./dist/index.html"),
    );
  },
});

console.log(`HTTP → http://localhost:${HTTP_PORT}`);
console.log(`WS   → ws://localhost:${WS_PORT}`);
console.log(`Debug: /debug/publish | /debug/clear`);

const wss = new WebSocketServer({ port: WS_PORT });
wss.on("connection", (ws) => {
  console.log("WS client connected");
  ws.send(JSON.stringify({ type: "welcome", message: "Connected!" }));
});

async function shutdown() {
  console.log("Shutting down RabbitShip server...");
  await stopConsumers();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
