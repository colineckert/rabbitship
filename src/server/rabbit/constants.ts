import { EVENT_TYPE, type EventType } from "../../game/types";

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

// Map event names (from game types) to routing keys used on the exchange.
// This keeps event names and routing keys in sync and avoids inline strings.
export const EVENT_TO_ROUTING: Record<EventType, string> = {
  [EVENT_TYPE.CREATE_GAME]: ROUTING_KEY.GAME_CREATED,
  [EVENT_TYPE.JOIN]: ROUTING_KEY.GAME_CREATED,
  [EVENT_TYPE.MOVE]: ROUTING_KEY.GAME_MOVE,
  [EVENT_TYPE.PLACE_SHIP]: ROUTING_KEY.GAME_ANY,
  [EVENT_TYPE.GAME_CREATED]: ROUTING_KEY.GAME_CREATED,
  [EVENT_TYPE.MOVE_RESULT]: ROUTING_KEY.GAME_ANY,
};
