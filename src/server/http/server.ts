import { serve } from 'bun';
import { getConfirmChannel, getConnection } from '../rabbit/connection';
import { QUEUE } from '../rabbit/constants';
import {
  startConsumers,
  stopConsumers,
  getGameEngine,
} from '../rabbit/consume';
import { publishTest } from '../rabbit/publish';
import { initTopology } from '../rabbit/setup';
import { startWsServer, stopWsServer } from '../ws';

const HTTP_PORT = 3000;
const WS_PORT = 8080;

async function startup() {
  console.log('Starting RabbitShip server...');
  await getConnection();
  await initTopology();
  await startConsumers();
  await getConfirmChannel();
  await startWsServer(WS_PORT);
}

startup().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function addCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

serve({
  port: HTTP_PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    let response: Response;

    if (url.pathname === '/health') {
      response = new Response('OK', { status: 200 });
    } else if (url.pathname === '/debug/rabbitmq') {
      try {
        await getConnection();
        response = new Response('RabbitMQ: Connected', { status: 200 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        response = new Response(`RabbitMQ: ${err.message}`, { status: 500 });
      }
    } else if (url.pathname === '/debug/publish') {
      await publishTest();
      response = new Response(`Test message sent → ${QUEUE.DEBUG}`, {
        status: 200,
      });
    } else if (url.pathname === '/debug/clear') {
      const conn = await getConnection();
      const ch = await conn.createChannel();
      await ch.purgeQueue(QUEUE.DEBUG);
      await ch.close();
      response = new Response(`${QUEUE.DEBUG} cleared`, { status: 200 });
    } else if (url.pathname === '/api/games') {
      try {
        const engine = getGameEngine();
        const availableGames = engine.getAvailableGames();
        response = new Response(JSON.stringify(availableGames), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        response = new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Serve React
      const filePath = url.pathname === '/' ? '/index.html' : url.pathname;
      const file = Bun.file(`./dist${filePath}`);
      response = new Response(
        (await file.exists()) ? file : Bun.file('./dist/index.html'),
      );
    }

    return addCorsHeaders(response);
  },
});

console.log(`HTTP → http://localhost:${HTTP_PORT}`);
console.log(`WS   → ws://localhost:${WS_PORT}`);
console.log(`Debug: /debug/publish | /debug/clear`);

async function shutdown() {
  console.log('Shutting down RabbitShip server...');
  await stopConsumers();
  await stopWsServer();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
