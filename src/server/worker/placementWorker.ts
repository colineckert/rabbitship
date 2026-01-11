import type amqp from "amqplib";
import type { GameEngine } from "../../game/engine";
import { AckType } from "../rabbit/subscribe";
import { handlePlaceShip } from "../../game/placement";
import { EVENT_TYPE, type PlaceShipEvent } from "../../game/types";
import { EVENT_TO_ROUTING, EXCHANGE } from "../rabbit/constants";
import { publishMsgPack } from "../rabbit/publish";

export function createPlacementHandler(
  engine: GameEngine,
  confirmCh: amqp.ConfirmChannel,
) {
  return async function placementHandler(
    placement: PlaceShipEvent,
  ): Promise<AckType> {
    try {
      const gameId = placement.gameId;
      if (!gameId) {
        console.error("PlaceShip event missing gameId");
        return AckType.NackDiscard;
      }

      const state = engine.getGame(gameId);
      if (!state) {
        console.error(`Game not found: ${gameId}`);
        return AckType.NackDiscard;
      }

      let success = false;
      try {
        success = handlePlaceShip(state, placement);
      } catch (err) {
        console.error("handlePlaceShip failed:", err);
        return AckType.NackDiscard;
      }

      if (success) {
        console.log(
          `[SHIP PLACED] game=${gameId} player=${placement.player} ship=${placement.ship}`,
        );
      } else {
        console.error(
          `Failed to place ship: game=${gameId} player=${placement.player} ship=${placement.ship}`,
        );
      }

      try {
        const routing = EVENT_TO_ROUTING[EVENT_TYPE.PLACE_SHIP];
        await publishMsgPack(confirmCh, EXCHANGE.GAME_EVENTS, routing, {
          ...placement,
          playerBoard:
            placement.player === "p1" ? state.p1.grid : state.p2.grid,
          success,
        });
        return AckType.Ack;
      } catch (err) {
        console.error("Failed to publish place ship result:", err);
        return AckType.NackRequeue;
      }
    } catch (err) {
      console.error("placementHandler unexpected error:", err);
      return AckType.NackDiscard;
    }
  };
}
