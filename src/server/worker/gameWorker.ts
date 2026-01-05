import type amqp from 'amqplib';
import { AckType } from '../rabbit/subscribe';
import { GameEngine } from '../../game/engine';
import {
  EVENT_TYPE,
  type JoinEvent,
  type CreateGameEvent,
  type GameCreatedEvent,
} from '../../game/types';
import { EVENT_TO_ROUTING, EXCHANGE } from '../rabbit/constants';
import { publishMsgPack } from '../rabbit/publish';

function makeGameId() {
  try {
    return crypto?.randomUUID?.();
  } catch {
    return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  }
}

export function createCreateGameHandler(
  engine: GameEngine,
  confirmCh: amqp.ConfirmChannel
) {
  return async function createHandler(
    payload: CreateGameEvent
  ): Promise<AckType> {
    try {
      const wsId = payload?.wsId;
      const player = payload?.player;
      const mode = payload?.mode ?? 'multiplayer';

      if (!wsId || !player) {
        console.error('Create event missing wsId or player');
        return AckType.NackDiscard;
      }

      const gameId = makeGameId();
      engine.createGame(gameId, mode);

      const state = engine.getGame(gameId)!;
      // assign creator to requested slot when available
      if (player === 'p1' || player === 'p2') {
        state.players[player] = wsId;
      }

      // Publish authoritative GAME_CREATED event
      try {
        const routing = EVENT_TO_ROUTING[EVENT_TYPE.GAME_CREATED];
        const payloadOut: GameCreatedEvent = {
          type: EVENT_TYPE.GAME_CREATED,
          gameId,
          players: state.players,
          mode: state.mode,
          createdAt: state.createdAt,
        };
        await publishMsgPack(
          confirmCh,
          EXCHANGE.GAME_EVENTS,
          routing,
          payloadOut
        );
        return AckType.Ack;
      } catch (err) {
        console.error('Failed to publish GAME_CREATED event:', err);
        return AckType.NackRequeue;
      }
    } catch (err) {
      console.error('createHandler unexpected error:', err);
      return AckType.NackDiscard;
    }
  };
}

export function createJoinGameHandler(
  engine: GameEngine,
  confirmCh: amqp.ConfirmChannel
) {
  return async function joinHandler(payload: JoinEvent): Promise<AckType> {
    try {
      const wsId: string | undefined = payload?.wsId;
      const player: string | undefined = payload?.player;
      const gameId: string | undefined = payload?.gameId;

      if (!wsId || !player || !gameId) {
        console.error('Join event missing wsId, player or gameId');
        return AckType.NackDiscard;
      }

      const state = engine.getGame(gameId);
      if (!state) {
        console.error(`Game not found for join: ${gameId}`);
        return AckType.NackDiscard;
      }

      // Assign wsId to the requested player slot if available
      if (player === 'p1' || player === 'p2') {
        if (!state.players[player]) {
          state.players[player] = wsId;
        } else {
          console.warn(`Player slot ${player} already taken in game ${gameId}`);
        }
      } else {
        console.warn(`Unknown player id in join: ${player}`);
      }

      // Publish join event for subscribers
      try {
        const routing = EVENT_TO_ROUTING[EVENT_TYPE.JOIN];
        const payloadOut = {
          type: EVENT_TYPE.JOIN,
          gameId,
          player,
          wsId,
          players: state.players,
          mode: state.mode,
          createdAt: state.createdAt,
        };
        await publishMsgPack(
          confirmCh,
          EXCHANGE.GAME_EVENTS,
          routing,
          payloadOut
        );
        return AckType.Ack;
      } catch (err) {
        console.error('Failed to publish join event:', err);
        return AckType.NackRequeue;
      }
    } catch (err) {
      console.error('joinHandler unexpected error:', err);
      return AckType.NackDiscard;
    }
  };
}
