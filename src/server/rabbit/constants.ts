// src/server/rabbit/constants.ts
export const EXCHANGE = {
  GAME_EVENTS: "game.events",
  DEAD_LETTER: "game.dlx",
} as const;

export const QUEUE = {
  GAME_SERVER: "game-server",
  DEBUG: "debug-queue",
  DLQ: "dlq",
} as const;

export const ROUTING_KEY = {
  // Game events
  GAME_ANY: "game.*",
  GAME_CREATED: "game.created",
  GAME_MOVE: "game.move",
  GAME_OVER: "game.over",

  // Debug
  TEST_ANY: "test.#",
  TEST_PUBLISH: "test.rabbitship",

  // Errors
  ERROR_ANY: "error.#",
  ERROR_DEBUG: "error.debug",
} as const;

// Optional: for UI
export const CONSTANTS = {
  EXCHANGE,
  QUEUE,
  ROUTING_KEY,
};
