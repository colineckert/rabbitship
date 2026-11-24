import './App.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EVENT_TYPE,
  type GameEvent,
  type GameMode,
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
import { SunkShipsTracker } from './components/SunkShipsTracker';
import { StatusBanner, type StatusTone } from './components/StatusBanner';
import { GameOverModal } from './components/GameOverModal';

type LogEntry = { time: string; text: string };
type GameOverInfo = { winner: PlayerId; totalMoves: number };

const emptyBoard = () =>
  Array.from({ length: 10 }, () => Array<string>(10).fill('empty'));
const allShipsUnplaced = () => ({
  carrier: true,
  battleship: true,
  cruiser1: true,
  cruiser2: true,
  destroyer: true,
});

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
  const [gameTitle, setGameTitle] = useState('My RabbitShip Game');
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<GameOverInfo | null>(null);
  const [shipsToPlace, setShipsToPlace] = useState(allShipsUnplaced);
  const [selectedShip, setSelectedShip] = useState<ShipKey | null>(null);
  const [direction, setDirection] = useState<Direction>('h');
  const [isPlacing, setIsPlacing] = useState(false);
  const [isFiring, setIsFiring] = useState(false);
  const [opponentShipsPlaced, setOpponentShipsPlaced] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<PlayerId>('p1');
  const [opponentSunkShips, setOpponentSunkShips] = useState<
    Partial<Record<ShipKey, boolean>>
  >({});

  const [playerBoard, setPlayerBoard] = useState<string[][]>(emptyBoard);
  const [opponentBoard, setOpponentBoard] = useState<string[][]>(emptyBoard);

  const [availableGames, setAvailableGames] = useState<Array<Game>>([]);

  function addLog(text: string) {
    setLogs((s) => [{ time: now(), text }, ...s].slice(0, 200));
    console.log(text);
  }

  // Handle incoming events from server
  const handleEvent = useCallback((data: GameEvent) => {
    console.log('Handling event:', data);

    if (data.type === EVENT_TYPE.GAME_CREATED) {
      console.log('*** Game created with ID:', data.gameId);
      setActiveGameId(data.gameId);
      if (data.mode === 'ai') {
        // AI ships are already placed server-side — mark opponent as immediately ready
        setOpponentShipsPlaced(5);
      }
    }
    if (data.type === EVENT_TYPE.PLAYER_JOINED) {
      console.log('*** Joined game with ID:', data.gameId);
      setActiveGameId(data.gameId);
    }
    if (data.type === EVENT_TYPE.PLACE_SHIP_RESULT) {
      setIsPlacing(false);
      if (data.success) {
        if (data.player === playerId.current) {
          setPlacementError(null);
          setPlayerBoard(data.playerBoard);
          setShipsToPlace((s) => ({ ...s, [data.ship]: false }));
          setSelectedShip(null);
        } else {
          setOpponentShipsPlaced((n) => n + 1);
        }
      } else {
        setPlacementError(
          'Could not place that ship there — try a different spot or direction.',
        );
        console.warn('Place ship failed:', data);
      }
    }
    if (data.type === EVENT_TYPE.MOVE_RESULT) {
      if (playerId.current === 'p1') {
        setPlayerBoard(data.p1Board);
        setOpponentBoard(data.p1OpponentBoard);
      } else {
        setPlayerBoard(data.p2Board);
        setOpponentBoard(data.p2OpponentBoard);
      }
      if (data.player === playerId.current && data.sunkShip) {
        setOpponentSunkShips((prev) => ({ ...prev, [data.sunkShip!]: true }));
      }
      setCurrentTurn(data.nextTurn);
      setIsFiring(false);
    }
    if (data.type === EVENT_TYPE.GAME_OVER) {
      // Update final boards and show game over overlay
      if (playerId.current === 'p1') {
        setPlayerBoard(data.finalBoards.p1Board);
        setOpponentBoard(data.finalBoards.p2Board);
      } else {
        setPlayerBoard(data.finalBoards.p2Board);
        setOpponentBoard(data.finalBoards.p1Board);
      }
      setIsFiring(false);
      setGameOver({ winner: data.winner, totalMoves: data.totalMoves });
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
  function newGame(mode: GameMode) {
    const player = 'p1';
    const title = gameTitle.trim() || null;
    playerId.current = player as PlayerId;
    send({
      type: EVENT_TYPE.CREATE_GAME,
      player,
      mode,
      title,
    });
  }

  function resetGame() {
    setActiveGameId(null);
    playerId.current = null;
    setShipsToPlace(allShipsUnplaced());
    setSelectedShip(null);
    setDirection('h');
    setIsPlacing(false);
    setIsFiring(false);
    setOpponentShipsPlaced(0);
    setCurrentTurn('p1');
    setOpponentSunkShips({});
    setPlayerBoard(emptyBoard());
    setOpponentBoard(emptyBoard());
    setPlacementError(null);
    setGameOver(null);
  }

  function joinGame(game: {
    gameId: string;
    mode: string;
    players: { p1: string | null; p2: string | null };
  }) {
    const gid = game.gameId;

    // Assign player to the open slot
    const player: PlayerId = !game.players.p1 ? 'p1' : 'p2';

    playerId.current = player;
    setActiveGameId(gid);
    // WS join just sets server mapping (and you could publish a JoinEvent separately)
    send({
      type: EVENT_TYPE.JOIN,
      gameId: gid,
      player,
    });
  }

  const allShipsPlaced = !Object.values(shipsToPlace).some((v) => v);
  const bothPlayersReady = allShipsPlaced && opponentShipsPlaced >= 5;
  const isMyTurn =
    bothPlayersReady && !gameOver && currentTurn === playerId.current;

  const shipsRemaining = Object.values(shipsToPlace).filter(Boolean).length;
  let status: { message: string; tone: StatusTone } | null = null;
  if (activeGameId) {
    if (gameOver) {
      const won = gameOver.winner === playerId.current;
      status = {
        message: won ? 'Victory! You sank the enemy fleet.' : 'Defeat.',
        tone: won ? 'success' : 'error',
      };
    } else if (placementError) {
      status = { message: placementError, tone: 'error' };
    } else if (!allShipsPlaced) {
      status = {
        message: selectedShip
          ? `Click the board to place your ship (${shipsRemaining} left)`
          : `Place your ships — select one from the list (${shipsRemaining} left)`,
        tone: 'info',
      };
    } else if (!bothPlayersReady) {
      status = {
        message: `Waiting for opponent to place ships (${opponentShipsPlaced}/5)…`,
        tone: 'warning',
      };
    } else if (isMyTurn) {
      status = {
        message: 'Your turn — fire at the opponent board!',
        tone: 'success',
      };
    } else {
      status = { message: "Opponent's turn…", tone: 'warning' };
    }
  }

  function handleOpponentBoardClick(x: number, y: number) {
    if (!activeGameId || isFiring || !isMyTurn) return;
    const player = playerId.current || 'p1';
    setIsFiring(true);
    send({
      type: EVENT_TYPE.MOVE,
      gameId: activeGameId,
      player,
      x,
      y,
    });
  }

  function handleBoardClick(x: number, y: number) {
    if (!selectedShip || !activeGameId || isPlacing) return;

    setIsPlacing(true);
    setPlacementError(null);
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
        {!activeGameId && (
          <div className="flex flex-col items-center gap-3">
            <input
              type="text"
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
              placeholder="Game title (optional)"
              maxLength={60}
              aria-label="Game title"
              className="px-3 py-2 border border-gray-300 rounded w-72 text-center"
            />
            <div className="flex gap-3">
              <button
                onClick={() => newGame('multiplayer')}
                className="px-4 py-2 bg-green-500 text-white rounded cursor-pointer"
              >
                New PvP
              </button>
              <button
                onClick={() => newGame('ai')}
                className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer"
              >
                New PvE
              </button>
            </div>
          </div>
        )}

        {status && <StatusBanner message={status.message} tone={status.tone} />}

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
                    onClick={() => joinGame(game)}
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
                  playerBoard={playerBoard}
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
                <Board playerBoard={playerBoard} />
              </div>
              <div>
                <h2 className="text-center text-xl font-bold mb-4">
                  Opponent Board
                </h2>
                <div className="flex gap-6">
                  <Board
                    playerBoard={opponentBoard}
                    onCellClick={handleOpponentBoardClick}
                    attackMode={true}
                    disabled={isFiring || !isMyTurn}
                  />
                  <SunkShipsTracker sunkShips={opponentSunkShips} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {gameOver && (
        <GameOverModal
          won={gameOver.winner === playerId.current}
          winnerLabel={gameOver.winner}
          totalMoves={gameOver.totalMoves}
          onNewGame={resetGame}
        />
      )}
    </div>
  );
}

export default App;
