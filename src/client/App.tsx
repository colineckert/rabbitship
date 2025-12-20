import "./App.css";
import { Board } from "./components/board";

function App() {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="pb-4 font-bold">RabbitShip</h1>
        <div>A Battleship game powered by RabbitMQ.</div>
      </div>
      <Board />
      <div className="mt-8 flex justify-center gap-4">
        <button
          type="button"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          New Game
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Join Game
        </button>
      </div>
    </>
  );
}

export default App;
