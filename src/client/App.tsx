import './App.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EVENT_TYPE,
  type GameEvent,
  type PlayerId,
  type ShipKey,
  type Game,
  type Direction,
  ShipLengthMap,
} from '../game/types';
import { Board } from './components/Board';
import { ShipList } from './components/ShipList';
import { DirectionToggle } from './components/DirectionToggle';
import { PlacementBoard } from './components/PlacementBoard';

type LogEntry = { time: string; text: string };

function now() {
  return new Date().toISOString();
}

function App() {
  const [wsState, setWsState] = useState('DISCONNECTED');
  const [wsId, setWsId] = useState<string | null>(null);
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
  const [selectedShip, setSelectedShip] = useState<ShipKey | null>(null);
  const [direction, setDirection] = useState<Direction>('h');
  const [isPlacing, setIsPlacing] = useState(false);

  const playerBoard = useRef<string[][]>(
    Array.from({ length: 10 }, () => Array(10).fill('empty')),
  );
  const opponentBoard = useRef<string[][]>(
    Array.from({ length: 10 }, () => Array(10).fill('empty')),
  );

  const [availableGames, setAvailableGames] = useState<Array<Game>>([]);

  function addLog(text: string) {
    setLogs((s) => [{ time: now(), text }, ...s].slice(0, 200));
    console.log(text);
  }

  // Handle incoming events from server
  const handleEvent = useCallback((data: GameEvent) => {
    console.log('Handling event:', data);

    if (
      data.type === EVENT_TYPE.GAME_CREATED ||
      data.type === EVENT_TYPE.PLAYER_JOINED
    ) {
      console.log('*** Game created with ID:', data.gameId);
      setActiveGameId(data.gameId);
    }
    if (data.type === EVENT_TYPE.PLACE_SHIP_RESULT) {
      setIsPlacing(false);
      if (data.success) {
        if (data.player === playerId.current) {
          playerBoard.current = data.playerBoard;
          setShipsToPlace((s) => ({ ...s, [data.ship]: false }));
          setSelectedShip(null);
        }
      } else {
        alert('Failed to place ship');
        console.warn('Place ship failed:', data);
      }
    }
    if (data.type === EVENT_TYPE.MOVE_RESULT) {
      // Always update boards based on current player's perspective
      if (playerId.current === 'p1') {
        playerBoard.current = data.p1Board; // P1's view
        opponentBoard.current = data.p2Board; // P1's view of P2's board
      } else {
        playerBoard.current = data.p2Board; // P2's view
        opponentBoard.current = data.p1Board; // P2's view of P1's board
      }
    }
    if (data.type === EVENT_TYPE.GAME_OVER) {
      alert('Game Over!');
      // Update final boards and show game over message
      if (playerId.current === 'p1') {
        playerBoard.current = data.finalBoards.p1Board;
        opponentBoard.current = data.finalBoards.p2Board;
      } else {
        playerBoard.current = data.finalBoards.p2Board;
        opponentBoard.current = data.finalBoards.p1Board;
      }

      const winnerText =
        data.winner === playerId.current ? 'You won!' : `${data.winner} won!`;
      alert(`Game Over!\n${winnerText}\nTotal moves: ${data.totalMoves}`);
    }
    if (data.type === EVENT_TYPE.GAMES_UPDATE) {
      setAvailableGames(data.games);
      addLog(`Updated: ${data.games.length} available games`);
    }
  }, []);

  useEffect(() => {
    const url = `ws://${location.hostname}:8080`;
    addLog(`Connecting to ${url}`);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsState('OPEN');
      addLog('WS open');
    };
    ws.onclose = () => {
      setWsState('CLOSED');
      addLog('WS closed');
    };
    ws.onerror = (error) => {
      addLog('WS error');
      console.error(error);
    };
    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        addLog(`RECV ← ${JSON.stringify(data)}`);

        if (data.type === 'welcome' && data.wsId) {
          setWsId(data.wsId);
        }

        handleEvent(data);
      } catch (error) {
        console.error('Failed to parse WS message', error);
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
      addLog('WS not open');
      return;
    }
    const text = JSON.stringify(payload);
    ws.send(text);
    addLog(`SENT → ${text}`);
  }

  // Quick helpers
  function newGame() {
    const player = 'p1';
    const title =
      prompt('Game title (optional):', 'My RabbitShip Game') || null;
    send({
      type: EVENT_TYPE.CREATE_GAME,
      player,
      // wsId optional (server will attach based on socket)
      mode: 'multiplayer',
      title,
    });

    playerId.current = player as PlayerId;
  }

  function joinGame(
    gameId?: string,
    game?: {
      gameId: string;
      mode: string;
      players: { p1: string | null; p2: string | null };
    },
  ) {
    const gid = gameId || game?.gameId || prompt('Enter gameId to join:');
    if (!gid) return;

    // Intelligently assign player to the null slot
    let player: PlayerId = 'p2'; // default
    if (game) {
      if (!game.players.p1) {
        player = 'p1';
      } else if (!game.players.p2) {
        player = 'p2';
      }
    } else {
      // Manual join without game info - prompt for player
      player = (prompt('Join as p1 or p2? (p1/p2)', 'p2') || 'p2') as PlayerId;
    }

    playerId.current = player;
    setActiveGameId(gid);
    // WS join just sets server mapping (and you could publish a JoinEvent separately)
    send({
      type: EVENT_TYPE.JOIN,
      gameId: gid,
      player,
    });
  }

  function fireMove() {
    const gameId = activeGameId || prompt('gameId?');
    if (!gameId) return;

    const player = playerId.current || prompt('player (p1/p2)', 'p1') || 'p1';
    const x = Number(prompt('x (0-9)', '0'));
    const y = Number(prompt('y (0-9)', '0'));
    send({
      type: EVENT_TYPE.MOVE,
      gameId,
      player,
      x,
      y,
    });
  }

  function handleBoardClick(x: number, y: number) {
    if (!selectedShip || !activeGameId || isPlacing) return;

    setIsPlacing(true);
    const player = playerId.current || 'p1';
    send({
      type: EVENT_TYPE.PLACE_SHIP,
      gameId: activeGameId,
      player,
      ship: selectedShip,
      x,
      y,
      dir: direction,
    });
  }

  return (
    <div className="p-6">
      <div className="mb-8 text-center">
        <h1 className="pb-4 font-bold">RabbitShip</h1>
        <div>
          WS Status: <strong>{wsState}</strong>
        </div>
        <span className="font-light text-sm">WS ID: {wsId}</span>
      </div>

      <div className="mb-6 flex gap-3 justify-center flex-col items-center">
        {!activeGameId ? (
          <div className="flex gap-3">
            <button
              onClick={newGame}
              className="px-4 py-2 bg-green-500 text-white rounded cursor-pointer"
            >
              New Game
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={fireMove}
              className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer disabled:opacity-50 disable:cursor-not-allowed"
              // disable firing moves until all ships placed
              disabled={Object.values(shipsToPlace).some((v) => v)}
            >
              Fire Move
            </button>
          </div>
        )}

        {!activeGameId && availableGames.length > 0 && (
          <div className="mt-6 w-full max-w-2xl">
            <h3 className="font-semibold text-lg mb-3">Available Games</h3>
            <div className="space-y-2">
              {availableGames.map((game) => (
                <div
                  key={game.gameId}
                  className="flex items-center justify-between p-3 bg-gray-100 rounded"
                >
                  <div className="text-left">
                    <div className="font-semibold text-sm text-black">
                      Game: {game.title || game.gameId.slice(0, 8)}
                    </div>
                    <div className="text-xs text-gray-600">
                      Mode: {game.mode} | Players:{' '}
                      {game.players.p1 ? 'P1 ✓' : 'P1 ✗'}{' '}
                      {game.players.p2 ? 'P2 ✓' : 'P2 ✗'}
                    </div>
                  </div>
                  <button
                    onClick={() => joinGame(game.gameId, game)}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded cursor-pointer hover:bg-blue-600"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showLogs && (
          <div className="mb-6">
            <h2 className="font-semibold text-lg">Logs</h2>
            <div
              style={{
                maxHeight: 320,
                overflow: 'auto',
                background: '#0f172a',
                color: '#e2e8f0',
                padding: 8,
              }}
            >
              {logs.map((l, i) => (
                <div
                  key={i}
                  className="grid grid-cols-7 gap-2"
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                >
                  <span
                    className="col-span-2 text-center"
                    style={{ color: '#94a3b8' }}
                  >
                    {l.time}{' '}
                  </span>
                  <span className="col-span-5 text-left">- {l.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-8 justify-center">
          {/* Setup Phase: Show Ship Placement UI */}
          {activeGameId && Object.values(shipsToPlace).some((v) => v) && (
            <div className="flex gap-8">
              <div className="flex flex-col gap-6">
                <ShipList
                  shipsToPlace={shipsToPlace}
                  selectedShip={selectedShip}
                  onSelectShip={setSelectedShip}
                  disabled={isPlacing}
                />
                <DirectionToggle
                  direction={direction}
                  onDirectionChange={setDirection}
                  selectedShip={selectedShip}
                  disabled={isPlacing}
                />
              </div>
              <div>
                <h2 className="text-center text-xl font-bold mb-4">
                  Place Ships
                </h2>
                <PlacementBoard
                  playerBoard={playerBoard.current}
                  onCellClick={handleBoardClick}
                  disabled={isPlacing}
                  currentShipLength={
                    selectedShip ? ShipLengthMap[selectedShip] : undefined
                  }
                  currentShipDirection={direction}
                />
              </div>
            </div>
          )}

          {/* Play Phase: Show both boards */}
          {activeGameId && !Object.values(shipsToPlace).some((v) => v) && (
            <>
              <div>
                <h2 className="text-center text-xl font-bold mb-4">
                  Player Board
                </h2>
                <Board playerBoard={playerBoard.current} />
              </div>
              <div>
                <h2 className="text-center text-xl font-bold mb-4">
                  Opponent Board
                </h2>
                <Board playerBoard={opponentBoard.current} />
              </div>
            </>
          )}

          {/* No active game: Show player/opponent boards as empty */}
          {!activeGameId && (
            <>
              <div>
                <h2 className="text-center text-xl font-bold mb-4">
                  Player Board
                </h2>
                <Board playerBoard={playerBoard.current} />
              </div>
              <div>
                <h2 className="text-center text-xl font-bold mb-4">
                  Opponent Board
                </h2>
                <Board playerBoard={opponentBoard.current} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
