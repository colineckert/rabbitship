import React from "react";
import { BOARD_SIZE } from "@/game";

export function Board() {
  return (
    <div>
      <div className="grid grid-cols-11 gap-1">
        <div></div>
        {[...Array(BOARD_SIZE)].map((_, x) => (
          <div key={x} className="text-center font-bold">
            {x}
          </div>
        ))}
        {[...Array(BOARD_SIZE)].map((_, y) => (
          <React.Fragment key={y}>
            <div className="font-bold">{y}</div>
            {[...Array(BOARD_SIZE)].map((_, x) => (
              <div
                key={x}
                className="w-10 h-10 border border-gray-400 bg-slate-100"
              ></div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
