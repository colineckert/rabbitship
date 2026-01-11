import "./App.css";
import { useEffect, useRef, useState } from "react";
import { Board } from "./components/board";
import { EVENT_TYPE } from "../game/types";

type LogEntry = { time: string; text: string };

function now() {
  return new Date().toISOString();
}

function App() {
  const [wsState, setWsState] = useState("DISCONNECTED");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const showLogs = import.meta.env.DEV;

  function addLog(text: string) {
    setLogs((s) => [{ time: now(), text }, ...s].slice(0, 200));
    // also console.log for server-side trace
    console.log(text);
  }

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
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addLog(`RECV ← ${JSON.stringify(data)}`);

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
  }, []);

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
  }

  function joinGame() {
    const gameId = prompt("Enter gameId to join:");
    if (!gameId) return;
    const player = prompt("Join as p1 or p2? (p1/p2)", "p2") || "p2";
    // WS join just sets server mapping (and you could publish a JoinEvent separately)
    send({
      type: EVENT_TYPE.JOIN,
      gameId,
      player,
    });
  }

  function placeShip() {
    const gameId = prompt("gameId?");
    if (!gameId) return;
    const player = prompt("player (p1/p2)", "p1") || "p1";
    const ship =
      prompt(
        "ship key (carrier/battleship/cruiser1/cruiser2/destroyer)",
        "carrier",
      ) || "carrier";
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
    const gameId = prompt("gameId?");
    if (!gameId) return;
    const player = prompt("player (p1/p2)", "p1") || "p1";
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
        <button
          onClick={newGame}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          New Game
        </button>
        <button
          onClick={joinGame}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Join Game
        </button>
        <button
          onClick={placeShip}
          className="px-4 py-2 bg-yellow-500 text-black rounded"
        >
          Place Ship
        </button>
        <button
          onClick={fireMove}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Fire Move
        </button>
      </div>

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
              <div key={i} style={{ fontFamily: "monospace", fontSize: 12 }}>
                <span style={{ color: "#94a3b8" }}>{l.time} </span>
                <span>{l.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Board />
      </div>
    </div>
  );
}

export default App;
