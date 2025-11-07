import { serve } from "bun";
import { WebSocketServer } from "ws";

serve({
  port: 3000,
  fetch() {
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
