import {
  type Cell,
  ShipLengthMap,
  type Direction,
  BOARD_SIZE,
  type GameState,
  type PlaceShipEvent,
  type ShipKey,
  type PlaceShipResultEvent,
  EVENT_TYPE,
} from "./types";

// update game state when user places ship
export function handlePlaceShip(
  gs: GameState,
  placement: PlaceShipEvent,
): PlaceShipResultEvent {
  console.log();
  console.log("==== Ship Placement Detected ====");

  const shipLength = ShipLengthMap[placement.ship];

  console.log(
    `${placement.player} places ${placement.ship} of length ${shipLength} at coordinates [${placement.x}, ${placement.y}] facing ${placement.dir}`,
  );

  const playerState = placement.player === "p1" ? gs.p1 : gs.p2;
  const success = tryPlaceShip(
    playerState.grid,
    placement.x,
    placement.y,
    placement.ship,
    placement.dir,
  );

  const result: PlaceShipResultEvent = {
    ...placement,
    type: EVENT_TYPE.PLACE_SHIP_RESULT,
    success,
    playerBoard: playerState.grid,
  };

  if (!success) {
    console.log("Ship placement failed due to invalid position or overlap.");
    throw new Error("Invalid ship placement");
  }

  playerState.shipsPlaced += 1;
  console.log(
    `${placement.player} successfully placed ${placement.ship}. Total ships placed: ${playerState.shipsPlaced}`,
  );

  return result;
}

export function tryPlaceShip(
  grid: Cell[][],
  x: number,
  y: number,
  ship: ShipKey,
  dir: Direction,
): boolean {
  const length = ShipLengthMap[ship];

  // Check if ship can be placed
  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return false;
  if (dir === "h" && x + length > BOARD_SIZE) return false;
  if (dir === "v" && y + length > BOARD_SIZE) return false;

  for (let i = 0; i < length; i++) {
    const cx = dir === "h" ? x + i : x;
    const cy = dir === "v" ? y + i : y;
    if (grid[cy][cx] !== "empty") return false; // Overlap
  }

  // Place ship
  for (let i = 0; i < length; i++) {
    const cx = dir === "h" ? x + i : x;
    const cy = dir === "v" ? y + i : y;
    grid[cy][cx] = `${ship}-ship`;
  }

  return true;
}

export function placeShipsRandomly(grid: Cell[][]): void {
  for (const ship in ShipLengthMap) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      const dir: Direction = Math.random() < 0.5 ? "h" : "v";
      const x = Math.floor(Math.random() * BOARD_SIZE);
      const y = Math.floor(Math.random() * BOARD_SIZE);
      placed = tryPlaceShip(grid, x, y, ship as ShipKey, dir);
      attempts++;
    }
    if (!placed) {
      throw new Error("Failed to place ship after 100 attempts");
    }
  }
}
