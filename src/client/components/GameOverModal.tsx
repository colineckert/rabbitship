type GameOverModalProps = {
  won: boolean;
  winnerLabel: string;
  totalMoves: number;
  onNewGame: () => void;
};

export function GameOverModal({
  won,
  winnerLabel,
  totalMoves,
  onNewGame,
}: GameOverModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
    >
      <div className="bg-white text-black rounded-lg shadow-xl p-8 max-w-sm w-full mx-4 text-center">
        <h2 id="game-over-title" className="text-3xl font-bold mb-2">
          Game Over
        </h2>
        <p
          className={`text-xl font-semibold mb-4 ${won ? 'text-green-600' : 'text-red-600'}`}
        >
          {won ? 'You won!' : `${winnerLabel} won!`}
        </p>
        <p className="text-gray-600 mb-6">Total moves: {totalMoves}</p>
        <button
          autoFocus
          onClick={onNewGame}
          className="px-5 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600"
        >
          New Game
        </button>
      </div>
    </div>
  );
}
