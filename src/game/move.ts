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

function maskShips(grid: string[][]): string[][] {
  return grid.map((row) =>
    row.map((cell) =>
      cell !== "empty" && cell !== "miss" && !cell.endsWith("-hit")
        ? "empty"
        : cell,
    ),
  );
}

function prepareBoardViews(gs: GameState): {
  p1Board: string[][];
  p2Board: string[][];
  p1OpponentBoard: string[][];
  p2OpponentBoard: string[][];
} {
  return {
    p1Board: gs.p1.grid.map((row) => [...row]),         // P1's own grid (full)
    p2Board: gs.p2.grid.map((row) => [...row]),         // P2's own grid (full)
    p1OpponentBoard: maskShips(gs.p2.grid),             // P2's grid hidden for P1
    p2OpponentBoard: maskShips(gs.p1.grid),             // P1's grid hidden for P2
  };
}

export type ShotResult =
  | { hit: false; sunkShip?: never }
  | { hit: true; sunkShip?: ShipKey };

function resolveShot(
  gs: GameState,
  shooter: PlayerId,
  x: number,
  y: number,
): ShotResult {
  const opponent = shooter === "p1" ? gs.p2 : gs.p1;
  const shooterBoard = shooter === "p1" ? gs.p1 : gs.p2;

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
  gs: GameState,
  move: MoveEvent,
): MoveResultEvent | null {
  console.log();
  console.log("==== Shot Detected ====");
  console.log(
    `${move.player} fires shot at coordinates [${move.x}, ${move.y}]`,
  );

  if (gs.turn !== move.player) {
    console.log("Not this player's turn.");
    throw new Error("Invalid: Not this player's turn.");
    // TODO: return null or publish event indicating invalid turn?
  }

  const isValidMove = isValidCoord(move.x, move.y);
  if (!isValidMove) {
    console.log("Invalid move: coordinates out of bounds.");
    throw new Error("Invalid move: coordinates out of bounds.");
    // TODO: return null or publish event indicating invalid turn?
  }

  const shotResult = resolveShot(gs, move.player, move.x, move.y);

  // Update player turn
  gs.turn = move.player === "p1" ? "p2" : "p1";

  // Sanitize board views before sending
  // This has to be based on wsId to ensure right wsClient gets correct view
  const { p1Board, p2Board, p1OpponentBoard, p2OpponentBoard } = prepareBoardViews(gs);

  const moveResult: MoveResultEvent = {
    gameId: move.gameId,
    type: EVENT_TYPE.MOVE_RESULT,
    x: move.x,
    y: move.y,
    hit: shotResult.hit,
    sunkShip: shotResult.sunkShip,
    shipsSunk: { p1: gs.p1.shipsSunk, p2: gs.p2.shipsSunk },
    p1Board,
    p2Board,
    p1OpponentBoard,
    p2OpponentBoard,
    player: move.player,
    nextTurn: move.player === "p1" ? "p2" : "p1",
  };

  return moveResult;
}
