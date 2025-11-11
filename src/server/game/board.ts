import {
  type Cell,
  type ShipLengths,
  type Direction,
  BOARD_SIZE,
} from "./types";

export function createEmptyBoard(): Cell[][] {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill("empty"));
}
