import { type ShipKey, ShipLengthMap } from '../../game/types';

type ShipListProps = {
  shipsToPlace: Record<ShipKey, boolean>;
  selectedShip: ShipKey | null;
  onSelectShip: (ship: ShipKey) => void;
  disabled?: boolean;
};

export function ShipList({
  shipsToPlace,
  selectedShip,
  onSelectShip,
  disabled = false,
}: ShipListProps) {
  const availableShips = Object.entries(shipsToPlace)
    .filter(([, toPlace]) => toPlace)
    .map(([shipKey]) => shipKey as ShipKey);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-lg">Ships to Place</h3>
      <div className="grid grid-cols-1 gap-2">
        {availableShips.length === 0 ? (
          <div className="text-sm text-gray-600">All ships placed!</div>
        ) : (
          availableShips.map((ship) => (
            <button
              key={ship}
              onClick={() => onSelectShip(ship)}
              disabled={disabled}
              className={`p-3 border rounded cursor-pointer transition text-left
                ${
                  selectedShip === ship
                    ? 'border-blue-500 border-2 bg-blue-100'
                    : 'border-gray-300 bg-gray-200 hover:bg-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
              `}
            >
              <div className="font-semibold text-sm">{ship}</div>
              <div className="text-xs text-gray-600">
                Length: {ShipLengthMap[ship]} cells
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
