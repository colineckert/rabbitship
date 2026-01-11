import React from "react";

type BoardProps = {
  playerBoard: string[][];
};

const cellToColor = (cell: string) => {
  switch (cell) {
    case "empty":
      return "bg-slate-100";
    case "miss":
      return "bg-blue-200";
    case "carrier-ship":
    case "battleship-ship":
    case "cruiser1-ship":
    case "cruiser2-ship":
    case "destroyer-ship":
      return "bg-gray-500";
    case "carrier-hit":
    case "battleship-hit":
    case "cruiser1-hit":
    case "cruiser2-hit":
    case "destroyer-hit":
      return "bg-red-500";
    default:
      return "bg-slate-100";
  }
};

export function Board({ playerBoard }: BoardProps) {
  if (!playerBoard || !playerBoard[0]) {
    return <div>No board data available.</div>;
  }

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
            {row.map((cell, colIndex) => (
              <div
                key={colIndex}
                className={`w-8 h-8 border ${cellToColor(cell)}`}
              ></div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
