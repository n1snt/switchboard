// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { nanoid } from 'nanoid';
import type { Call, CallState } from '@switchboard/shared';
import type { EventBus } from '../events/bus';
import type { Logger } from '../logger';
import type { AriOperations } from './operations';
import {
  ChannelHangupRequestEventSchema,
  StasisEndEventSchema,
  StasisStartEventSchema,
  type StasisStartEvent,
} from './events';

// The walking-skeleton call logic (feature 9). It bridges two legs through ARI so
// two browser tabs get clean two-way audio, and publishes the call lifecycle on
// the event bus. Later features (16/17) layer trunk auth, routing, and direction
// on top of the same choreography.
//
// Dialplan contract: an inbound (caller) channel enters Stasis(<app>) with no
// extra arguments and its dialed target in `channel.dialplan.exten`. The
// originated callee leg re-enters Stasis with args ['dialed', <bridgeId>].

interface CallSession {
  callId: string;
  bridgeId: string;
  callerChannelId: string;
  calleeChannelId?: string;
  dialed: string;
  from: string;
  startedAt: string;
  answeredAt?: string;
}

export interface CoordinatorDeps {
  ops: AriOperations;
  bus: EventBus;
  appName: string;
  logger: Logger;
  /** Injectable clock and id generator for deterministic tests. */
  now?: () => string;
  idGen?: () => string;
}

/** Map a subset of ARI hangup cause codes to a human-readable cause. */
function causeText(cause?: number): string {
  switch (cause) {
    case 17:
      return 'busy';
    case 18:
    case 19:
      return 'timeout';
    case 21:
      return 'declined';
    default:
      return 'normal';
  }
}

export class CallCoordinator {
  private readonly ops: AriOperations;
  private readonly bus: EventBus;
  private readonly appName: string;
  private readonly logger: Logger;
  private readonly now: () => string;
  private readonly idGen: () => string;
  private readonly byChannel = new Map<string, CallSession>();
  private readonly byBridge = new Map<string, CallSession>();

  constructor(deps: CoordinatorDeps) {
    this.ops = deps.ops;
    this.bus = deps.bus;
    this.appName = deps.appName;
    this.logger = deps.logger;
    this.now = deps.now ?? ((): string => new Date().toISOString());
    this.idGen = deps.idGen ?? ((): string => nanoid());
  }

  /** Sync, self-contained handlers for the connection manager to register. */
  handlers(): Record<string, (payload: unknown) => void> {
    return {
      StasisStart: (payload) => {
        const result = StasisStartEventSchema.safeParse(payload);
        if (!result.success) {
          this.logger.warn('ari: ignoring malformed StasisStart event');
          return;
        }
        this.run(() => this.onStasisStart(result.data));
      },
      StasisEnd: (payload) => {
        const result = StasisEndEventSchema.safeParse(payload);
        if (!result.success) {
          this.logger.warn('ari: ignoring malformed StasisEnd event');
          return;
        }
        this.run(() => this.onHangup(result.data.channel.id, 'normal'));
      },
      ChannelHangupRequest: (payload) => {
        const result = ChannelHangupRequestEventSchema.safeParse(payload);
        if (!result.success) {
          this.logger.warn(
            'ari: ignoring malformed ChannelHangupRequest event',
          );
          return;
        }
        this.run(() =>
          this.onHangup(result.data.channel.id, causeText(result.data.cause)),
        );
      },
    };
  }

  /** Caller enters Stasis: answer, bridge, and originate the callee leg. */
  async onStasisStart(event: StasisStartEvent): Promise<void> {
    const channelId = event.channel.id;

    if (event.args[0] === 'dialed') {
      const bridgeId = event.args[1];
      const session =
        bridgeId === undefined ? undefined : this.byBridge.get(bridgeId);
      if (!session) {
        this.logger.warn(
          `ari: callee leg ${channelId} with no matching bridge; hanging up`,
        );
        await this.ops.hangup(channelId);
        return;
      }
      session.calleeChannelId = channelId;
      session.answeredAt = this.now();
      this.byChannel.set(channelId, session);
      await this.ops.answer(channelId);
      await this.ops.addToBridge(session.bridgeId, channelId);
      this.publish('call.answered', session, 'answered');
      return;
    }

    const dialed = event.channel.dialplan?.exten;
    if (dialed === undefined || dialed === '') {
      this.logger.warn(
        `ari: caller leg ${channelId} with no dialed target; hanging up`,
      );
      await this.ops.hangup(channelId);
      return;
    }

    const session: CallSession = {
      callId: this.idGen(),
      bridgeId: '',
      callerChannelId: channelId,
      dialed,
      from: event.channel.caller?.number ?? channelId,
      startedAt: this.now(),
    };
    await this.ops.answer(channelId);
    session.bridgeId = await this.ops.createBridge();
    await this.ops.addToBridge(session.bridgeId, channelId);
    this.byChannel.set(channelId, session);
    this.byBridge.set(session.bridgeId, session);
    this.publish('call.created', session, 'created');
    this.publish('call.ringing', session, 'ringing');

    const calleeId = await this.ops.originate({
      endpoint: `PJSIP/${dialed}`,
      app: this.appName,
      appArgs: ['dialed', session.bridgeId],
      callerId: session.from,
    });
    session.calleeChannelId = calleeId;
    this.byChannel.set(calleeId, session);
  }

  /** Either leg hangs up: tear the bridge down and end the other leg. */
  async onHangup(channelId: string, cause: string): Promise<void> {
    const session = this.byChannel.get(channelId);
    if (!session) {
      return;
    }
    const otherLeg =
      channelId === session.callerChannelId
        ? session.calleeChannelId
        : session.callerChannelId;

    await this.safe(
      () => this.ops.destroyBridge(session.bridgeId),
      'destroy bridge',
    );
    if (otherLeg !== undefined) {
      await this.safe(() => this.ops.hangup(otherLeg), 'hang up other leg');
    }

    this.byChannel.delete(session.callerChannelId);
    if (session.calleeChannelId !== undefined) {
      this.byChannel.delete(session.calleeChannelId);
    }
    this.byBridge.delete(session.bridgeId);

    this.publish('call.ended', session, 'ended', {
      ended_at: this.now(),
      hangup_cause: cause,
    });
  }

  private run(work: () => Promise<void>): void {
    work().catch((err: unknown) => {
      this.logger.error(`ari: call handling failed: ${String(err)}`);
    });
  }

  private async safe(work: () => Promise<void>, what: string): Promise<void> {
    try {
      await work();
    } catch (err) {
      this.logger.warn(`ari: failed to ${what}: ${String(err)}`);
    }
  }

  private publish(
    type: 'call.created' | 'call.ringing' | 'call.answered' | 'call.ended',
    session: CallSession,
    state: CallState,
    extra?: { ended_at?: string; hangup_cause?: string },
  ): void {
    const call: Call = {
      id: session.callId,
      direction: 'outbound',
      from_number: session.from,
      to_number: session.dialed,
      trunk_id: null,
      state,
      started_at: session.startedAt,
      answered_at: session.answeredAt ?? null,
      ended_at: extra?.ended_at ?? null,
      hangup_cause: extra?.hangup_cause ?? null,
      codec: null,
      recording: null,
    };
    this.bus.publish({ type, at: this.now(), call });
  }
}
