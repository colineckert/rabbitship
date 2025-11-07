import { serve } from "bun";
import { WebSocketServer } from "ws";
import { getRabbitMQConnection } from "../rabbit/connection";
import { publishTest } from "../rabbit/publish";

serve({
  port: 3000,
  fetch: async (req) => {
    const url = new URL(req.url);

    if (url.pathname === "/debug/rabbitmq") {
      try {
        const conn = await getRabbitMQConnection();
        const ch = await conn.createChannel();
        await ch.checkExchange("game.events");
        await ch.close();
        return new Response("RabbitMQ: Connected + game.events exists", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        return new Response(`RabbitMQ: ${err.message}`, { status: 500 });
      }
    }

    if (url.pathname === "/debug/publish") {
      await publishTest();
      return new Response("Test message published! Check RabbitMQ UI", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }

    return new Response("RabbitShip server running — Bun + WebSocket ready!", {
      headers: { "Content-Type": "text/plain" },
    });
  },
});

console.log("HTTP server on http://localhost:3000");

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.send(JSON.stringify({ type: "welcome", message: "Connected!" }));
});

console.log("WebSocket server on ws://localhost:8080");
