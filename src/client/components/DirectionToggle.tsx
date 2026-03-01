import { type Direction } from '../../game/types';

type DirectionToggleProps = {
  direction: Direction;
  onDirectionChange: (dir: Direction) => void;
  selectedShip: string | null;
  disabled?: boolean;
};

export function DirectionToggle({
  direction,
  onDirectionChange,
  selectedShip,
  disabled = false,
}: DirectionToggleProps) {
  const isDisabled = disabled || !selectedShip;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-lg">Direction</h3>
      <div className="flex gap-2">
        <button
          onClick={() => onDirectionChange('h')}
          disabled={isDisabled}
          className={`px-4 py-2 border rounded cursor-pointer transition font-semibold
            ${
              direction === 'h'
                ? 'bg-blue-500 text-white border-blue-600'
                : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
            }
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          Horizontal (H)
        </button>
        <button
          onClick={() => onDirectionChange('v')}
          disabled={isDisabled}
          className={`px-4 py-2 border rounded cursor-pointer transition font-semibold
            ${
              direction === 'v'
                ? 'bg-blue-500 text-white border-blue-600'
                : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
            }
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          Vertical (V)
        </button>
      </div>
    </div>
  );
}
