import { type Cell, ShipLengths, type Direction, BOARD_SIZE } from "./types";

export function createEmptyBoard(): Cell[][] {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill("empty"));
}

export function tryPlaceShip(
  grid: Cell[][],
  x: number,
  y: number,
  length: number,
  dir: Direction,
): boolean {
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
    grid[cy][cx] = "ship";
  }

  return true;
}

export function placeShipsRandomly(grid: Cell[][]): void {
  for (const length of ShipLengths) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      const dir: Direction = Math.random() < 0.5 ? "h" : "v";
      const x = Math.floor(Math.random() * BOARD_SIZE);
      const y = Math.floor(Math.random() * BOARD_SIZE);
      placed = tryPlaceShip(grid, x, y, length, dir);
      attempts++;
    }
    if (!placed) {
      throw new Error("Failed to place ship after 100 attempts");
    }
  }
}
