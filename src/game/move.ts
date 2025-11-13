import type { GameState, MoveEvent, MoveResultEvent } from "@/game/types";

export function handleMove(
  state: GameState,
  move: MoveEvent,
): MoveResultEvent | null {
  console.log();
  console.log("==== Shot Detected ====");
  console.log(
    `${move.player} fires shot at coordinates [${move.x}, ${move.y}]`,
  );

  const opponent = move.player === "p1" ? state.p2 : state.p1;
  // Check if the shot is a hit
  let hit = false;

  return null;
}
