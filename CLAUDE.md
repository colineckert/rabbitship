# RabbitShip — CLAUDE.md

## Project Overview

RabbitShip is a real-time multiplayer battleship game demonstrating message-driven game architecture. It showcases event-sourced game design, RabbitMQ pub/sub, WebSocket real-time communication, and server-authoritative logic (preventing client-side cheating).

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4
- **Backend**: Bun runtime, Bun HTTP server (port 3000), WebSocket server (port 8080)
- **Messaging**: RabbitMQ (via Docker), amqplib, MessagePack serialization
- **Validation**: Zod
- **Tooling**: ESLint (flat config v9), Concurrently

## Common Commands

```bash
# Development
npm run dev        # Vite dev server (client only, ~port 5173)
npm run server     # Bun server (HTTP + WS + workers)
npm run full       # Both concurrently

# Build & Lint
npm run build      # TypeScript compile + Vite build → /dist
npm run lint       # ESLint on all .ts/.tsx
npm run preview    # Preview production build

# Infrastructure
docker-compose up -d rabbitmq   # Start RabbitMQ
```

## Project Structure

```
src/
├── client/          # React frontend (App.tsx, components/)
├── game/            # Shared isomorphic game logic
│   ├── types.ts     # Event types, interfaces, constants
│   ├── engine.ts    # GameEngine class (state management)
│   ├── move.ts      # Shot resolution logic
│   ├── placement.ts # Ship placement validation
│   └── utils.ts     # Board utilities
└── server/
    ├── http/        # Bun HTTP server (port 3000, serves /dist)
    ├── ws/          # WebSocket server (port 8080)
    ├── rabbit/      # RabbitMQ connection, publish, consume, broadcast
    └── worker/      # Event processors (game, placement, move workers)
```

## Architecture

**Event flow:**
```
Client → WS Server → RabbitMQ → Worker → GameEngine → RabbitMQ → Broadcaster → WS Clients
```

**RabbitMQ topology:**
- Exchange: `game.events` (topic)
- Queues: `game-server`, `debug-queue`, `dlq`
- Dead Letter Exchange: `game.dlx`

**Key patterns:**
- `GameEngine` holds all active game state in memory (no DB persistence)
- `wsId` auto-assigned per connection; `wsToGame` map enforces server-side auth
- All client payloads validated with Zod before publishing to RabbitMQ
- Player-specific board views hide opponent ship positions

## TypeScript Conventions

- **Strict mode** throughout (`noUnusedLocals`, `noUnusedParameters`)
- **Path aliases** (configured in both `tsconfig.app.json` and `tsconfig.node.json`):
  - `@/*` → `src/*`
  - `@/game/*` → `src/game/*`
  - `@/rabbit/*` → `src/server/rabbit/*`
  - `@/ws/*` → `src/server/ws/*`
- Client code in `src/client/` is excluded from the server TS config (and vice versa)
- Shared game logic in `src/game/` is included in both configs

## Environment

**Required services:**
- Docker + Docker Compose (RabbitMQ)
- Bun (server runtime)
- Node.js + npm (dev tooling)

**Environment variables:**
- `RABBITMQ_URL` — defaults to `amqp://guest:guest@localhost:5672`
- `NODE_ENV` — `development` or `production`

**Ports:**
| Service | Port |
|---------|------|
| HTTP server | 3000 |
| WebSocket server | 8080 |
| Vite dev server | 5173 |
| RabbitMQ AMQP | 5672 |
| RabbitMQ Management UI | 15672 |

## Testing

No test framework is currently configured. The game engine logic in `src/game/` is the best candidate for unit tests (pure functions, no I/O).

## Notable Gotchas

- The Vite dev server proxies to the Bun server — run `npm run server` before `npm run dev` for full functionality
- RabbitMQ must be running before the server starts; workers will fail to connect otherwise
- Game state is in-memory only — restarting the server clears all active games
