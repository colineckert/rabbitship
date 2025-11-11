export type PlayerId = "p1" | "p2" | "ai";

export type GameMode = "ai" | "multiplayer";

export type GamePhase = "setup" | "play" | "over";

export type Cell = "empty" | "ship" | "hit" | "miss";

export const BOARD_SIZE = 10;

export interface Ships {
  carrier: 5; // Aircraft Carrier
  battleship: 4; // Battleship
  cruiser1: 3; // Cruiser
  cruiser2: 3; // Cruiser
  destroyer: 2; // Destroyer/Submarine
}

export type ShipLengths = [5, 4, 3, 3, 2]; // Total: 17 squares

export type Direction = "h" | "v";

export interface ShipPlacement {
  x: number;
  y: number;
  length: number;
  dir: Direction;
}

export interface GameState {
  // Metadata
  id: string;
  mode: GameMode;
  phase: GamePhase;
  createdAt: number;

  // Players (wsId for multiplayer, 'ai' for AI)
  players: {
    p1: string | null; // wsId or null (not joined)
    p2: string | null | "ai";
  };

  // Current turn (only during 'play')
  turn: PlayerId;

  // Player 1: Own ships + opponent's shots
  p1: {
    grid: Cell[][]; // 10x10: own ships layout
    shots: Set<string>; // Hits/misses on P2 (for P1 view)
    shipsPlaced: number; // 0-5 (setup progress)
    shipsSunk: number; // 0-5 (win check)
  };

  // Player 2: Own ships + opponent's shots
  p2: {
    grid: Cell[][]; // 10x10: own ships (hidden from P1)
    shots: Set<string>; // Hits/misses on P1 (for P2 view)
    shipsPlaced: number; // 0-5
    shipsSunk: number; // 0-5
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
      return "empty"; // Hide ships
    }),
  );
}

// Validation helpers
export function isValidCoord(x: number, y: number): boolean {
  return x >= 0 && x < 10 && y >= 0 && y < 10;
}

export function gameOver(state: GameState): boolean {
  return (
    state.phase === "over" ||
    state.p1.shipsSunk === 5 ||
    state.p2.shipsSunk === 5
  );
}

export function isPlayersTurn(state: GameState, player: PlayerId): boolean {
  return state.phase === "play" && state.turn === player;
}

// Event payloads (for pub/sub)
export interface JoinEvent {
  type: "join";
  player: PlayerId;
  wsId: string;
}

export interface PlaceShipEvent {
  type: "place-ship";
  player: PlayerId;
  ship: keyof Ships; // 'carrier' | 'battleship' | ...
  x: number;
  y: number;
  dir: Direction;
}

export interface MoveEvent {
  type: "move";
  player: PlayerId;
  x: number;
  y: number;
}

export interface MoveResultEvent {
  type: "move-result";
  x: number;
  y: number;
  hit: boolean;
  sunkShip?: keyof Ships;
  nextTurn: PlayerId;
  p1Board: string[][]; // Opponent view for P1
  p2Board: string[][]; // Opponent view for P2
  shipsSunk: { p1: number; p2: number };
}

export type GameEvent = JoinEvent | PlaceShipEvent | MoveEvent;
