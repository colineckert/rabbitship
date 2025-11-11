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

## Architecture

RabbitMQ setup diagram:

```mermaid
graph TD
    subgraph "Exchanges"
        A[game.events<br/>topic, durable] -->|test.#| B[debug-queue]
        A -->|game.*| C[game-server]
        A -->|error.#| D[dlq]
        E[game.dlx<br/>direct, durable] -->|error.*| D
    end

    subgraph "Queues"
        B[debug-queue<br/>durable, 7-day TTL, max 1000]
        C[game-server<br/>durable]
        D[dlq<br/>durable]
    end

    style A fill:#4ade80,stroke:#166534
    style E fill:#f87171,stroke:#991b1b
    style B fill:#60a5fa,stroke:#1e40af
    style C fill:#fbbf24,stroke:#f59e0b
    style D fill:#f87171,stroke:#991b1b
```

File structure:

```
src/
├── server/
│   ├── game/
│   │   ├── types.ts          ← ONLY types/interfaces
│   │   ├── board.ts          ← ship placement logic
│   │   ├── shot.ts           ← shot resolution
│   │   ├── ai.ts             ← AI brain
│   │   ├── engine.ts         ← main GameEngine class
│   │   └── index.ts          ← barrel export
│   ├── rabbit/
│   │   ├── constants.ts
│   │   ├── connection.ts
│   │   ├── setup.ts
│   │   ├── publisher.ts
│   │   ├── consumer.ts
│   │   └── index.ts
│   └── http/
│       └── server.ts
└── ws/
    └── server.ts
```
