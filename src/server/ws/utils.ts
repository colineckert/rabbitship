export function isCreateGamePayload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any
): obj is { player: string; mode?: string } {
  return obj && typeof obj.player === 'string';
}

export function isJoinPayload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any
): obj is { gameId: string } {
  return obj && typeof obj.gameId === 'string';
}

export function isPlaceShipPayload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any
): obj is { player: string; ship: string; x: number; y: number; dir: string } {
  return (
    obj &&
    typeof obj.player === 'string' &&
    typeof obj.ship === 'string' &&
    typeof obj.x === 'number' &&
    typeof obj.y === 'number' &&
    typeof obj.dir === 'string'
  );
}

export function isMovePayload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any
): obj is { player: string; x: number; y: number } {
  return (
    obj &&
    typeof obj.player === 'string' &&
    typeof obj.x === 'number' &&
    typeof obj.y === 'number'
  );
}
