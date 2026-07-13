// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type {
  CallDirection,
  PhoneNumber,
  Route,
  Trunk,
} from '@switchboard/shared';
import { matchRoute } from '../routes/match';
import { resolveRecordEnabled } from '../recording/recording';
import { planOutgoing } from './dialing';

// Features 16 and 17: the pure decision the coordinator makes when a caller
// channel enters Stasis. It turns "who is calling and what did they dial" into
// the direction, the parties, the trunk, the endpoint to originate the callee
// leg to, and whether to record. The ARI choreography around it lives in
// coordinator.ts; keeping this pure makes both directions exhaustively testable.

/**
 * The browser softphone endpoint an inbound trunk call rings (feature 16). Matches
 * a static WebRTC endpoint in engine/config/pjsip.conf.template; an explicit
 * outbound route may override the destination.
 */
export const SOFTPHONE_ENDPOINT = '1001';

export interface CallPlanInput {
  /** The call id, used to name a recording file. */
  callId: string;
  /** What the caller dialed (the channel's dialplan extension). */
  dialed: string;
  /** The presented caller identity. */
  from: string;
  /**
   * The trunk the caller arrived on when the call came in on a provisioned trunk
   * (feature 16); undefined when the browser softphone is the caller (feature 17).
   */
  callerTrunk: Trunk | undefined;
  numbers: PhoneNumber[];
  trunks: Trunk[];
  routes: Route[];
  /** The resolved global record-all setting. */
  recordAll: boolean;
}

export interface CallPlan {
  direction: CallDirection;
  from: string;
  to: string;
  trunkId: string | null;
  /** The ARI endpoint the callee leg is originated to. */
  calleeEndpoint: string;
  /** The recording filename to store on the call, or null when not recording. */
  recording: string | null;
}

/** Derive the PJSIP endpoint from an ARI channel name like `PJSIP/1001-00000abc`. */
export function endpointFromChannelName(
  name: string | undefined,
): string | undefined {
  if (name === undefined) {
    return undefined;
  }
  const slash = name.indexOf('/');
  const dash = name.lastIndexOf('-');
  if (slash === -1 || dash <= slash) {
    return undefined;
  }
  return name.slice(slash + 1, dash);
}

/** Plan a call from the caller's role, what they dialed, and current config. */
export function planCall(input: CallPlanInput): CallPlan {
  const recording = resolveRecordEnabled(undefined, undefined, input.recordAll)
    ? `${input.callId}.wav`
    : null;

  if (input.callerTrunk !== undefined) {
    const route = matchRoute(input.routes, 'outbound', input.dialed);
    const destination = route?.destination ?? 'softphone';
    return {
      direction: 'outbound',
      from: input.from,
      to: input.dialed,
      trunkId: input.callerTrunk.id,
      calleeEndpoint:
        destination === 'softphone'
          ? `PJSIP/${SOFTPHONE_ENDPOINT}`
          : `PJSIP/${destination}`,
      recording,
    };
  }

  const out = planOutgoing(input.dialed, {
    numbers: input.numbers,
    trunks: input.trunks,
  });
  return {
    direction: 'inbound',
    from: input.from,
    to: out.toNumber,
    trunkId: out.trunkId,
    calleeEndpoint: out.endpoint,
    recording,
  };
}
