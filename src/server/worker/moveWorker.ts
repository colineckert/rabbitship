import type amqp from 'amqplib';
import { publishMsgPack } from '../rabbit/publish';
import { EXCHANGE, EVENT_TO_ROUTING } from '../rabbit/constants';
import { handleMove } from '../../game/move';
import type { GameEngine } from '../../game/engine';
import { EVENT_TYPE, type GameState, type MoveEvent } from '../../game/types';
import { AckType } from '../rabbit/subscribe';

// Returns a handler that accepts a deserialized Move payload and returns an AckType.
export function createMoveHandler(
  engine: GameEngine,
  confirmCh: amqp.ConfirmChannel,
) {
  return async function moveHandler(move: MoveEvent): Promise<AckType> {
    console.log('===== Received Move event =====', move);
    try {
      const gameId = move.gameId;
      if (!gameId) {
        console.error('Move event missing gameId');
        return AckType.NackDiscard;
      }

      const state = engine.getGame(gameId);
      if (!state) {
        console.error(`Game not found: ${gameId}`);
        return AckType.NackDiscard;
      }

      console.log('====== Game State [Move] =======', state);

      let result = null;
      try {
        result = handleMove(state as GameState, move);
      } catch (err) {
        console.error('handleMove failed:', err);
        return AckType.NackDiscard;
      }

      console.log('====== Game State [Move Result] =======', { state, result });

      if (!result) return AckType.Ack;

      try {
        const routing = EVENT_TO_ROUTING[EVENT_TYPE.MOVE_RESULT];
        await publishMsgPack(confirmCh, EXCHANGE.GAME_EVENTS, routing, result);
        console.log(
          `[MOVE PROCESSED] game=${gameId} player=${move.player} coord=${move.x},${move.y}`,
        );
        // TODO: consider publishing GAME_OVER event if game ended
        return AckType.Ack;
      } catch (err) {
        console.error('Failed to publish move result:', err);
        return AckType.NackRequeue;
      }
    } catch (err) {
      console.error('moveHandler unexpected error:', err);
      return AckType.NackDiscard;
    }
  };
}
