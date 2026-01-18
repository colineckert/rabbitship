import {
  type GameState,
  type MoveEvent,
  type MoveResultEvent,
  type PlayerId,
  type ShipKey,
  ShipLengthMap,
  EVENT_TYPE,
} from "./types";

function isValidCoord(x: number, y: number): boolean {
  return x >= 0 && x < 10 && y >= 0 && y < 10;
}

export type ShotResult =
  | { hit: false; sunkShip?: never }
  | { hit: true; sunkShip?: ShipKey };

function resolveShot(
  state: GameState,
  shooter: PlayerId,
  x: number,
  y: number,
): ShotResult {
  const opponent = shooter === "p1" ? state.p2 : state.p1;
  const shooterBoard = shooter === "p1" ? state.p1 : state.p2;

  const coordKey = `${x},${y}`;
  if (shooterBoard.shots.has(coordKey)) {
    console.log("Coordinate already shot at.");
    return { hit: false };
  }

  shooterBoard.shots.add(coordKey);

  const cell = opponent.grid[y][x];

  // Miss
  if (cell === "empty" || cell === "miss" || cell.endsWith("-hit")) {
    opponent.grid[y][x] = "miss";
    console.log("Shot result: Miss.");
    return { hit: false };
  }

  // Hit
  const shipKey = cell as ShipKey;
  opponent.grid[y][x] = `${shipKey}-hit`;

  // Track hits on the ship
  opponent.shipHits = opponent.shipHits || {};
  opponent.shipHits[shipKey] = (opponent.shipHits[shipKey] || 0) + 1;

  // Check if ship is sunk
  const wasSunk = opponent.shipHits[shipKey] === ShipLengthMap[shipKey];
  if (wasSunk) {
    opponent.shipsSunk += 1;
    console.log(`Shot result: Hit and sunk ${shipKey}.`);
  }

  return {
    hit: true,
    sunkShip: wasSunk ? shipKey : undefined,
  };
}

// active game and user fires a shot;
// determine if hit or miss and update game state
export function handleMove(
  state: GameState,
  move: MoveEvent,
): MoveResultEvent | null {
  console.log();
  console.log("==== Shot Detected ====");
  console.log(
    `${move.player} fires shot at coordinates [${move.x}, ${move.y}]`,
  );

  const isValidMove = isValidCoord(move.x, move.y);
  if (!isValidMove) {
    console.log("Invalid move: coordinates out of bounds.");
    throw new Error("Invalid move: coordinates out of bounds.");
  }

  const shotResult = resolveShot(state, move.player, move.x, move.y);

  const moveResult: MoveResultEvent = {
    gameId: move.gameId,
    type: EVENT_TYPE.MOVE_RESULT,
    x: move.x,
    y: move.y,
    hit: shotResult.hit,
    sunkShip: shotResult.sunkShip,
    shipsSunk: { p1: state.p1.shipsSunk, p2: state.p2.shipsSunk },
    p1Board: state.p1.grid,
    p2Board: state.p2.grid,
    player: move.player,
    nextTurn: move.player === "p1" ? "p2" : "p1",
  };

  return moveResult;
}
