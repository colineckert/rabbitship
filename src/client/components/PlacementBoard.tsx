import { Board } from './Board';
import { type Direction } from '../../game/types';

type PlacementBoardProps = {
  playerBoard: string[][];
  onCellClick: (x: number, y: number) => void;
  disabled?: boolean;
  currentShipLength?: number;
  currentShipDirection?: Direction;
};

export function PlacementBoard({
  playerBoard,
  onCellClick,
  disabled = false,
  currentShipLength,
  currentShipDirection,
}: PlacementBoardProps) {
  return (
    <Board
      playerBoard={playerBoard}
      onCellClick={onCellClick}
      disabled={disabled}
      currentShipLength={currentShipLength}
      currentShipDirection={currentShipDirection}
    />
  );
}
