import { createEmptyBoard } from './utils';
import { placeShipsRandomly } from './placement';
import type { Game, GameMode, GamePhase, GameState } from './types';

export class GameEngine {
  private games: Map<string, GameState>;

  constructor() {
    this.games = new Map();
  }

  createGame(
    id: string,
    mode: GameMode,
    title: string | null = null,
  ): GameState {
    const state: GameState = {
      id,
      mode,
      title,
      phase: 'setup' as GamePhase,
      createdAt: Date.now(),
      players: { p1: null, p2: mode === 'ai' ? 'ai' : null },
      turn: 'p1',
      winner: null,
      moves: 0,
      p1: {
        grid: createEmptyBoard(),
        shots: new Set(),
        shipsPlaced: 0,
        shipsSunk: 0,
        shipHits: {},
      },
      p2: {
        grid: createEmptyBoard(),
        shots: new Set(),
        shipsPlaced: 0,
        shipsSunk: 0,
        shipHits: {},
      },
    };

    if (mode === 'ai') {
      placeShipsRandomly(state.p2.grid);
      state.p2.shipsPlaced = 5;
    }

    // Store the game state
    this.games.set(id, state);
    return state;
  }

  getGame(id: string): GameState | null {
    return this.games.get(id) || null;
  }

  deleteGame(id: string): void {
    this.games.delete(id);
  }

  getAvailableGames(): Game[] {
    return Array.from(this.games.values())
      .filter((game) => game.players.p1 === null || game.players.p2 === null)
      .map((game) => ({
        gameId: game.id,
        mode: game.mode,
        title: game.title,
        players: game.players,
      }));
  }
}
