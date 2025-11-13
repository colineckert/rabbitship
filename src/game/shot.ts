import type { GameState, MoveEvent, MoveResultEvent } from "@/game/types";

export function handleShot(
  state: GameState,
  move: MoveEvent,
): MoveResultEvent | null {
  console.log();
  console.log("==== Move Detected ====");
  console.log(
    `${move.player} fires shot at coordinates [${move.x}, ${move.y}]`,
  );

  return null;
}
