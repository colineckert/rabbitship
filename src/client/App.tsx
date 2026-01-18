import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EVENT_TYPE,
  type GameEvent,
  type PlayerId,
  type ShipKey,
} from "../game/types";
import { Board } from "./components/Board";
type LogEntry = { time: string; text: string };

function now() {
  return new Date().toISOString();
}

// TODO: consider global store for tracking games

function App() {
  const [wsState, setWsState] = useState("DISCONNECTED");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const showLogs = import.meta.env.DEV;

  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const playerId = useRef<PlayerId | null>(null);
  const [shipsToPlace, setShipsToPlace] = useState({
    carrier: true,
    battleship: true,
    cruiser1: true,
    cruiser2: true,
    destroyer: true,
  });

  const playerBoard = useRef<string[][]>(
    Array.from({ length: 10 }, () => Array(10).fill("empty")),
  );
  const opponentBoard = useRef<string[][]>(
    Array.from({ length: 10 }, () => Array(10).fill("empty")),
  );

  function addLog(text: string) {
    setLogs((s) => [{ time: now(), text }, ...s].slice(0, 200));
    console.log(text);
  }

  // Handle incoming events from server
  const handleEvent = useCallback((data: GameEvent) => {
    // TODO: expand handling based on event types with proper typing
    console.log("Handling event:", data);

    if (
      data.type === EVENT_TYPE.GAME_CREATED ||
      data.type === EVENT_TYPE.PLAYER_JOINED
    ) {
      console.log("*** Game created with ID:", data.gameId);
      setActiveGameId(data.gameId);
    }
    if (data.type === EVENT_TYPE.PLACE_SHIP_RESULT) {
      console.log("*** Updating player board from event ***");
      playerBoard.current = data.playerBoard;
    }
    if (data.type === EVENT_TYPE.MOVE_RESULT) {
      console.log("*** Updating player board from move result ***", {
        data,
        playerId,
      });

      playerBoard.current =
        playerId.current === "p1" ? data.p1Board : data.p2Board;
      opponentBoard.current =
        playerId.current === "p1" ? data.p2Board : data.p1Board;
    }
  }, []);

  useEffect(() => {
    const url = `ws://${location.hostname}:8080`;
    addLog(`Connecting to ${url}`);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsState("OPEN");
      addLog("WS open");
    };
    ws.onclose = () => {
      setWsState("CLOSED");
      addLog("WS closed");
    };
    ws.onerror = (error) => {
      addLog("WS error");
      console.error(error);
    };
    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        addLog(`RECV ← ${JSON.stringify(data)}`);

        handleEvent(data);

        // TODO: handle event types and update board
      } catch (error) {
        console.error("Failed to parse WS message", error);
        addLog(`RECV ← ${String(event.data)}`);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [handleEvent]);

  function send(payload: object) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addLog("WS not open");
      return;
    }
    const text = JSON.stringify(payload);
    ws.send(text);
    addLog(`SENT → ${text}`);
  }

  // Quick helpers
  function newGame() {
    const player = "p1";
    send({
      type: EVENT_TYPE.CREATE_GAME,
      player,
      // wsId optional (server will attach based on socket)
      mode: "multiplayer",
    });

    playerId.current = player as PlayerId;
  }

  function joinGame() {
    const gameId = prompt("Enter gameId to join:");
    if (!gameId) return;
    const player = prompt("Join as p1 or p2? (p1/p2)", "p2") || "p2";
    playerId.current = player as PlayerId;
    // WS join just sets server mapping (and you could publish a JoinEvent separately)
    send({
      type: EVENT_TYPE.JOIN,
      gameId,
      player,
    });
  }

  function placeShip() {
    const gameId = activeGameId || prompt("gameId?");
    if (!gameId) return;

    const player = playerId.current || prompt("player (p1/p2)", "p1") || "p1";

    const availableShips = Object.entries(shipsToPlace)
      .filter(([, toPlace]) => toPlace)
      .map(([shipKey]) => shipKey);
    if (availableShips.length === 0) {
      alert("No ships left to place!");
      return;
    }

    let ship: ShipKey;
    while (true) {
      const shipInput = prompt(
        `ship key (${availableShips.join("/")})`,
        availableShips[0],
      );
      if (shipInput && availableShips.includes(shipInput)) {
        ship = shipInput as ShipKey;
        break;
      }
      alert("Invalid ship key, please try again.");
    }

    setShipsToPlace((s) => ({ ...s, [ship]: false }));

    const x = Number(prompt("x (0-9)", "0"));
    const y = Number(prompt("y (0-9)", "0"));
    const dir = prompt("dir (h/v)", "h") || "h";

    send({
      type: EVENT_TYPE.PLACE_SHIP,
      gameId,
      player,
      ship,
      x,
      y,
      dir,
    });
  }

  function fireMove() {
    const gameId = activeGameId || prompt("gameId?");
    if (!gameId) return;

    const player = playerId.current || prompt("player (p1/p2)", "p1") || "p1";
    const x = Number(prompt("x (0-9)", "0"));
    const y = Number(prompt("y (0-9)", "0"));
    send({
      type: EVENT_TYPE.MOVE,
      gameId,
      player,
      x,
      y,
    });
  }

  return (
    <div className="p-6">
      <div className="mb-8 text-center">
        <h1 className="pb-4 font-bold">RabbitShip — WS Test</h1>
        <div>
          WS status: <strong>{wsState}</strong>
        </div>
      </div>

      <div className="mb-6 flex gap-3 justify-center">
        {!activeGameId ? (
          <div className="flex gap-3">
            <button
              onClick={newGame}
              className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer"
            >
              New Game
            </button>
            <button
              onClick={joinGame}
              className="px-4 py-2 bg-green-500 text-white rounded cursor-pointer"
            >
              Join Game
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={placeShip}
              className="px-4 py-2 bg-yellow-500 text-black rounded cursor-pointer"
            >
              Place Ship
            </button>
            <button
              onClick={fireMove}
              className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer"
            >
              Fire Move
            </button>
          </div>
        )}
      </div>

      {/* TODO: if no activeGameId, show availalbe game buttons */}

      {showLogs && (
        <div className="mb-6">
          <h2 className="font-semibold">Logs</h2>
          <div
            style={{
              maxHeight: 320,
              overflow: "auto",
              background: "#0f172a",
              color: "#e2e8f0",
              padding: 8,
            }}
          >
            {logs.map((l, i) => (
              <div
                key={i}
                className="grid grid-cols-7 gap-2"
                style={{ fontFamily: "monospace", fontSize: 12 }}
              >
                <span
                  className="col-span-2 text-center"
                  style={{ color: "#94a3b8" }}
                >
                  {l.time}{" "}
                </span>
                <span className="col-span-5 text-left">- {l.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex gap-8 justify-center">
        <div>
          <h2 className="text-center text-xl font-bold mb-4">Player Board</h2>
          <Board playerBoard={playerBoard.current} />
        </div>
        <div>
          <h2 className="text-center text-xl font-bold mb-4">Opponent Board</h2>
          <Board playerBoard={opponentBoard.current} />
        </div>
      </div>
    </div>
  );
}

export default App;
