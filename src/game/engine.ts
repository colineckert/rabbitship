import type { GameState, GamePhase, GameMode } from "./types";
import { placeShipsRandomly } from "./placement";
import { createEmptyBoard } from "./board";

export class GameEngine {
  private games: Map<string, GameState>;

  constructor() {
    this.games = new Map();
  }

  createGame(id: string, mode: GameMode): GameState {
    const state: GameState = {
      id,
      mode,
      phase: "setup" as GamePhase,
      createdAt: Date.now(),
      players: { p1: null, p2: mode === "ai" ? "ai" : null },
      turn: "p1",
      winner: null,
      moves: 0,
      p1: {
        grid: createEmptyBoard(),
        shots: new Set(),
        shipsPlaced: 0,
        shipsSunk: 0,
      },
      p2: {
        grid: createEmptyBoard(),
        shots: new Set(),
        shipsPlaced: 0,
        shipsSunk: 0,
      },
    };

    if (mode === "ai") {
      placeShipsRandomly(state.p2.grid);
      state.p2.shipsPlaced = 5;
    }

    // Store the game state
    this.games.set(id, state);
    return state;
  }
}
