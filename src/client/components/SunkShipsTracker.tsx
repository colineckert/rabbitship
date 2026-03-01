import { ShipLengthMap, type ShipKey } from '../../game/types';

const SHIP_LABELS: Record<ShipKey, string> = {
  carrier: 'Carrier',
  battleship: 'Battleship',
  cruiser1: 'Cruiser I',
  cruiser2: 'Cruiser II',
  destroyer: 'Destroyer',
};

type Props = {
  sunkShips: Partial<Record<ShipKey, boolean>>;
};

export function SunkShipsTracker({ sunkShips }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {(Object.keys(ShipLengthMap) as ShipKey[]).map((ship) => {
        const isSunk = !!sunkShips[ship];
        return (
          <div key={ship} className="flex flex-col gap-1">
            <span
              className={`text-xs font-medium ${isSunk ? 'text-red-500 line-through' : 'text-gray-500'}`}
            >
              {SHIP_LABELS[ship]}
            </span>
            <div className="flex gap-0.5">
              {Array.from({ length: ShipLengthMap[ship] }).map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 border ${isSunk ? 'bg-red-500 border-red-600' : 'bg-gray-400 border-gray-500'}`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
