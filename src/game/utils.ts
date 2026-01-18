import { type Cell, BOARD_SIZE } from "./types";

export function createEmptyBoard(): Cell[][] {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill("empty"));
}

export function printBoard(grid: Cell[][]): void {
  console.log("  0 1 2 3 4 5 6 7 8 9");
  for (let y = 0; y < BOARD_SIZE; y++) {
    let row = `${y} `;
    for (let x = 0; x < BOARD_SIZE; x++) {
      switch (grid[y][x]) {
        case "empty":
          row += ". ";
          break;
        case "carrier-ship":
        case "battleship-ship":
        case "cruiser1-ship":
        case "cruiser2-ship":
        case "destroyer-ship":
          row += "S ";
          break;
        case "carrier-hit":
        case "battleship-hit":
        case "cruiser1-hit":
        case "cruiser2-hit":
        case "destroyer-hit":
          row += "X ";
          break;
        case "miss":
          row += "O ";
          break;
      }
    }
    console.log(row);
  }
}
