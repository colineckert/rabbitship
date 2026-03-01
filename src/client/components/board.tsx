import React, { type ReactNode, useState } from 'react';
import { type Direction } from '../../game/types';

type BoardProps = {
  playerBoard: string[][];
  onCellClick?: (x: number, y: number) => void;
  disabled?: boolean;
  currentShipLength?: number;
  currentShipDirection?: Direction;
};

const cellToColor = (cell: string) => {
  switch (cell) {
    case 'empty':
      return 'bg-slate-100';
    case 'miss':
      return 'bg-blue-200';
    case 'carrier-ship':
    case 'battleship-ship':
    case 'cruiser1-ship':
    case 'cruiser2-ship':
    case 'destroyer-ship':
      return 'bg-gray-500';
    case 'carrier-ship-hit':
    case 'battleship-ship-hit':
    case 'cruiser1-ship-hit':
    case 'cruiser2-ship-hit':
    case 'destroyer-ship-hit':
      return 'bg-red-500';
    default:
      return 'bg-slate-100';
  }
};

export function Board({
  playerBoard,
  onCellClick,
  disabled = false,
  currentShipLength,
  currentShipDirection,
}: BoardProps) {
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);

  if (!playerBoard || !playerBoard[0]) {
    return <div>No board data available.</div>;
  }

  // Calculate which cells would be occupied by the ship preview
  const getPreviewCells = () => {
    if (!hoveredCell || !currentShipLength || !currentShipDirection) {
      return new Set<string>();
    }

    const [hoverX, hoverY] = hoveredCell;
    const cells = new Set<string>();

    if (currentShipDirection === 'h') {
      // Horizontal placement
      for (let i = 0; i < currentShipLength; i++) {
        const x = hoverX + i;
        if (x < 10) {
          cells.add(`${x},${hoverY}`);
        }
      }
    } else {
      // Vertical placement
      for (let i = 0; i < currentShipLength; i++) {
        const y = hoverY + i;
        if (y < 10) {
          cells.add(`${hoverX},${y}`);
        }
      }
    }

    return cells;
  };

  const previewCells = getPreviewCells();
  const isInPreview = (x: number, y: number) => previewCells.has(`${x},${y}`);

  const handleMouseEnter = (x: number, y: number) => {
    if (onCellClick && !disabled) {
      setHoveredCell([x, y]);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  return (
    <div>
      <div className="grid grid-cols-11 gap-1">
        <div></div>
        {playerBoard[0].map((_, colIndex) => (
          <div key={colIndex} className="text-center font-bold">
            {colIndex}
          </div>
        ))}
        {playerBoard.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            <div className="text-center font-bold">{rowIndex}</div>
            {row.map((cell, colIndex) => {
              const inPreview = isInPreview(colIndex, rowIndex);
              const isHovered =
                hoveredCell &&
                hoveredCell[0] === colIndex &&
                hoveredCell[1] === rowIndex;

              let className = `w-8 h-8 border ${cellToColor(cell)}`;

              // Add preview styling
              if (inPreview && onCellClick && !disabled) {
                if (isHovered) {
                  // Hovered cell - darker preview
                  className =
                    'w-8 h-8 border bg-blue-400 opacity-80 cursor-pointer';
                } else {
                  // Other cells in preview - lighter preview
                  className =
                    'w-8 h-8 border bg-blue-200 opacity-60 cursor-pointer hover:opacity-75';
                }
              } else if (onCellClick && !disabled) {
                className += ' cursor-pointer hover:opacity-75';
              }

              if (disabled) {
                className += ' opacity-50 cursor-not-allowed';
              }

              const cellElement: ReactNode = (
                <div
                  key={colIndex}
                  className={className}
                  onClick={() => onCellClick?.(colIndex, rowIndex)}
                  onMouseEnter={() => handleMouseEnter(colIndex, rowIndex)}
                  onMouseLeave={handleMouseLeave}
                  role={onCellClick ? 'button' : undefined}
                  tabIndex={onCellClick && !disabled ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onCellClick && !disabled && e.key === 'Enter') {
                      onCellClick(colIndex, rowIndex);
                    }
                  }}
                />
              );
              return cellElement;
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
