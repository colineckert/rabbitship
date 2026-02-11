export type PlayerId = 'p1' | 'p2' | 'ai';

export type GameMode = 'ai' | 'multiplayer';

export type GamePhase = 'setup' | 'play' | 'over';

export const BOARD_SIZE = 10;

export type ShipKey =
  | 'carrier'
  | 'battleship'
  | 'cruiser1'
  | 'cruiser2'
  | 'destroyer';

export const ShipLengthMap: Record<ShipKey, number> = {
  carrier: 5,
  battleship: 4,
  cruiser1: 3,
  cruiser2: 3,
  destroyer: 2,
};

export const ShipLengths = [5, 4, 3, 3, 2]; // Total: 17 squares

export type Direction = 'h' | 'v';

export type Cell = 'empty' | 'miss' | `${ShipKey}-ship` | `${ShipKey}-hit`;

export interface ShipPlacement {
  x: number;
  y: number;
  length: number;
  dir: Direction;
}

export interface GameState {
  // Metadata
  id: string;
  title: string | null;
  mode: GameMode;
  phase: GamePhase;
  createdAt: number;

  // Players (wsId for multiplayer, 'ai' for AI)
  players: {
    p1: string | null; // wsId or null (not joined)
    p2: string | null | 'ai';
  };

  // Current turn (only during 'play')
  turn: PlayerId;

  // Player 1: Own ships + opponent's shots
  p1: {
    grid: Cell[][]; // 10x10: own ships layout
    shots: Set<string>; // Hits/misses on P2 (for P1 view)
    shipsPlaced: number; // 0-5 (setup progress)
    shipsSunk: number; // 0-5 (win check)
    shipHits: Partial<Record<ShipKey, number>>; // Track hits per ship
  };

  // Player 2: Own ships + opponent's shots
  p2: {
    grid: Cell[][]; // 10x10: own ships (hidden from P1)
    shots: Set<string>; // Hits/misses on P1 (for P2 view)
    shipsPlaced: number; // 0-5
    shipsSunk: number; // 0-5
    shipHits: Partial<Record<ShipKey, number>>; // Track hits per ship
  };

  // Stats
  moves: number; // Total shots fired
  winner: PlayerId | null; // Set on 'over'
}

// Helper: Opponent view (hide ships)
export function serializeOpponentBoard(
  grid: Cell[][],
  opponentShots: Set<string>,
): string[][] {
  return grid.map((row, y) =>
    row.map((_, x) => {
      const coord = `${x},${y}`;
      if (opponentShots.has(coord)) return grid[y][x]; // hit/miss
      return 'empty'; // Hide ships
    }),
  );
}

// Validation helpers
export function isValidCoord(x: number, y: number): boolean {
  return x >= 0 && x < 10 && y >= 0 && y < 10;
}

export function gameOver(state: GameState): boolean {
  return (
    state.phase === 'over' ||
    state.p1.shipsSunk === 5 ||
    state.p2.shipsSunk === 5
  );
}

export function isPlayersTurn(state: GameState, player: PlayerId): boolean {
  return state.phase === 'play' && state.turn === player;
}

export const EVENT_TYPE = {
  JOIN: 'join',
  PLAYER_JOINED: 'player-joined',
  CREATE_GAME: 'create-game',
  GAME_CREATED: 'game-created',
  PLACE_SHIP: 'place-ship',
  PLACE_SHIP_RESULT: 'place-ship-result',
  MOVE: 'move',
  MOVE_RESULT: 'move-result',
  GAME_OVER: 'game-over',
  GAMES_UPDATE: 'games-update',
} as const;

export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];

// Event payloads (for pub/sub)
export interface JoinEvent {
  type: typeof EVENT_TYPE.JOIN;
  player: PlayerId;
  wsId: string;
  gameId: string;
}

export interface PlayerJoinedEvent {
  type: typeof EVENT_TYPE.PLAYER_JOINED;
  gameId: string;
  player: PlayerId;
}

export interface CreateGameEvent {
  type: typeof EVENT_TYPE.CREATE_GAME;
  player: PlayerId; // requested player slot (p1/p2)
  wsId: string;
  mode?: GameMode;
  title: string | null;
}

export interface GameCreatedEvent {
  type: typeof EVENT_TYPE.GAME_CREATED;
  gameId: string;
  title: string | null;
  players: { p1: string | null; p2: string | null | 'ai' };
  mode: GameMode;
  createdAt: number;
}

export interface Game {
  gameId: string;
  title: string | null;
  mode: GameMode;
  players: { p1: string | null; p2: string | null | 'ai' };
}

export interface PlaceShipEvent {
  gameId: string;
  type: typeof EVENT_TYPE.PLACE_SHIP;
  player: PlayerId;
  ship: ShipKey; // 'carrier' | 'battleship' | ...
  x: number;
  y: number;
  dir: Direction;
}

export interface PlaceShipResultEvent {
  gameId: string;
  type: typeof EVENT_TYPE.PLACE_SHIP_RESULT;
  success: boolean;
  player: PlayerId;
  ship: ShipKey; // 'carrier' | 'battleship' | ...
  x: number;
  y: number;
  dir: Direction;
  playerBoard: Cell[][];
}

export interface MoveEvent {
  gameId: string;
  wsId: string;
  type: typeof EVENT_TYPE.MOVE;
  player: PlayerId;
  x: number;
  y: number;
}

export interface MoveResultEvent {
  gameId: string;
  type: typeof EVENT_TYPE.MOVE_RESULT;
  x: number;
  y: number;
  hit: boolean;
  sunkShip?: ShipKey;
  player: PlayerId;
  nextTurn: PlayerId;
  p1Board: string[][]; // Opponent view for P1
  p2Board: string[][]; // Opponent view for P2
  shipsSunk: { p1: number; p2: number };
}

export interface GameOverEvent {
  gameId: string;
  type: typeof EVENT_TYPE.GAME_OVER;
  winner: PlayerId;
  finalBoards: {
    p1Board: string[][]; // Final board view for P1
    p2Board: string[][]; // Final board view for P2
  };
  shipsSunk: { p1: number; p2: number };
  totalMoves: number;
}

export interface GamesUpdateEvent {
  type: typeof EVENT_TYPE.GAMES_UPDATE;
  games: Array<{
    gameId: string;
    mode: GameMode;
    title: string | null;
    players: { p1: string | null; p2: string | null };
  }>;
}

export type GameEvent =
  | JoinEvent
  | PlayerJoinedEvent
  | CreateGameEvent
  | GameCreatedEvent
  | PlaceShipEvent
  | PlaceShipResultEvent
  | MoveEvent
  | MoveResultEvent
  | GameOverEvent
  | GamesUpdateEvent;
