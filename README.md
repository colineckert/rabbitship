# RabbitShip ⚓ Real-Time Battleship with RabbitMQ

**No frameworks. Raw `amqplib`. AI + Multiplayer. 6 dependencies.**

- AI uses **Hunt/Target + Parity** (wins in ~64 moves)
- Multiplayer: 2 browsers, instant sync
- All communication via **RabbitMQ pub/sub**
- Live demo: https://rabbitship.onrender.com

## Run Locally

```bash
docker compose up --build
```

### Quick Dev Run (recommended)

Prereqs: Docker (for RabbitMQ) and Bun (server runtime). Node/npm for client build.

1. Start RabbitMQ:

```bash
docker-compose up -d rabbitmq
# visit RabbitMQ UI: http://localhost:15672 (guest/guest)
```

2. Install dependencies (client/tools):

```bash
npm install
```

3. Start the server (Bun):

```bash
npm run server
# or: bun run src/server/http/server.ts
```

4. Start the client dev server (optional):

```bash
npm run dev
# open http://localhost:3000
```

Notes:

- WebSocket endpoint: `ws://localhost:8080`.
- If running via Docker Compose the `app` service will be built and started and already points RabbitMQ at the `rabbitmq` service.

## Architecture

RabbitMQ setup diagram:

```mermaid
graph LR
        subgraph Clients
            Client[Browser WS client]
        end

        subgraph Transport
            WS[WS Server]
        end

        subgraph Broker
            Ex[game.events topic]
            Q1[game-server queue]
            Q2[debug-queue]
            DLQ[dlq]
            DLX[game.dlx]
        end

        subgraph Workers
            Worker[game workers (create/join/place/move)]
            Broadcaster[broadcaster]
        end

        Client -->|intent| WS -->|publish| Ex
        Ex -->|game.server routing| Q1
        Ex -->|test.#| Q2
        Ex -->|error.#| DLQ
        DLX -->|error.*| DLQ
        Q1 --> Worker
        Ex --> Broadcaster
        Broadcaster -->|forward| WS

        style Ex fill:#4ade80,stroke:#166534
        style DLX fill:#f87171,stroke:#991b1b
        style Q2 fill:#60a5fa,stroke:#1e40af
        style Q1 fill:#fbbf24,stroke:#f59e0b
        style DLQ fill:#f87171,stroke:#991b1b
```
