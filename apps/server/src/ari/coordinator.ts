// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { nanoid } from 'nanoid';
import type {
  Call,
  CallDirection,
  CallState,
  PhoneNumber,
  Route,
  Trunk,
} from '@switchboard/shared';
import type { EventBus } from '../events/bus';
import type { Logger } from '../logger';
import {
  endpointFromChannelName,
  planCall,
  TRUNK_CONTEXT,
} from '../modules/calls/call-plan';
import type { SipTraceRegistrar } from '../modules/calls/sip-trace-capture';
import type { AriOperations } from './operations';
import {
  ChannelHangupRequestEventSchema,
  StasisEndEventSchema,
  StasisStartEventSchema,
  type StasisStartEvent,
} from './events';

// The call choreography over ARI. A caller channel enters Stasis, the coordinator
// plans the call (direction, parties, trunk, and callee endpoint; see
// call-plan.ts), answers the caller, bridges it, originates the callee leg back
// into Stasis, and publishes the lifecycle on the event bus. It handles both
// directions on the same choreography: a call arriving on a provisioned trunk
// rings the softphone (feature 16, outbound), and the softphone dialling a
// number, trunk, or SIP URI reaches the system-under-test (feature 17, inbound);
// a bare extension is the browser-to-browser walking skeleton (feature 9).
//
// Dialplan contract: a caller channel enters Stasis(<app>) with no extra
// arguments, its dialed target in `channel.dialplan.exten`, and its context in
// `channel.dialplan.context` (the trunk context marks a system-under-test call
// even when the trunk cannot be identified, e.g. anonymous none-auth). The
// originated callee leg re-enters Stasis with args ['dialed', <bridgeId>].

interface CallSession {
  callId: string;
  bridgeId: string;
  callerChannelId: string;
  calleeChannelId?: string;
  direction: CallDirection;
  from: string;
  to: string;
  trunkId: string | null;
  /** The recording filename when this call should be recorded, else null. */
  recording: string | null;
  /** Whether bridge recording has actually started. */
  recordingStarted: boolean;
  /** The negotiated audio codec once known, else null. */
  codec: string | null;
  /** The last published lifecycle state, for mid-call updates. */
  state: CallState;
  startedAt: string;
  answeredAt?: string;
}

/** What the coordinator reads from the control plane to plan each call. */
export interface CallDirectory {
  trunks(): Promise<Trunk[]>;
  numbers(): Promise<PhoneNumber[]>;
  routes(): Promise<Route[]>;
  recordAll(): Promise<boolean>;
}

export interface CoordinatorDeps {
  ops: AriOperations;
  bus: EventBus;
  appName: string;
  logger: Logger;
  directory: CallDirectory;
  /** Told each call's SIP Call-IDs so the trace can be attributed per dialog. */
  traceRegistrar?: SipTraceRegistrar;
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

/** Reduce Asterisk's `CHANNEL(audionativeformat)` value (e.g. `(ulaw)`) to a name. */
function normalizeCodec(raw: string): string | null {
  const cleaned = raw.replace(/[()]/g, '').trim();
  return cleaned === '' ? null : cleaned;
}

export class CallCoordinator implements SipTraceRegistrar {
  private readonly ops: AriOperations;
  private readonly bus: EventBus;
  private readonly appName: string;
  private readonly logger: Logger;
  private readonly directory: CallDirectory;
  private readonly traceRegistrar: SipTraceRegistrar | undefined;
  private readonly now: () => string;
  private readonly idGen: () => string;
  private readonly byChannel = new Map<string, CallSession>();
  private readonly byBridge = new Map<string, CallSession>();
  private readonly byCall = new Map<string, CallSession>();

  constructor(deps: CoordinatorDeps) {
    this.ops = deps.ops;
    this.bus = deps.bus;
    this.appName = deps.appName;
    this.logger = deps.logger;
    this.directory = deps.directory;
    this.traceRegistrar = deps.traceRegistrar;
    this.now = deps.now ?? ((): string => new Date().toISOString());
    this.idGen = deps.idGen ?? ((): string => nanoid());
  }

  /** Implements SipTraceRegistrar; forwards to the wired trace capture, if any. */
  registerCallId(callId: string, sipCallId: string): void {
    this.traceRegistrar?.registerCallId(callId, sipCallId);
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

  /** Caller enters Stasis: plan the call, answer, bridge, and originate the callee. */
  async onStasisStart(event: StasisStartEvent): Promise<void> {
    const channelId = event.channel.id;

    if (event.args[0] === 'dialed') {
      await this.onCalleeEntered(channelId, event.args[1]);
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

    const [trunks, numbers, routes, recordAll] = await Promise.all([
      this.directory.trunks(),
      this.directory.numbers(),
      this.directory.routes(),
      this.directory.recordAll(),
    ]);
    const endpoint = endpointFromChannelName(event.channel.name);
    const callerTrunk =
      endpoint === undefined
        ? undefined
        : trunks.find((trunk) => trunk.id === endpoint);
    const trunkCall =
      event.channel.dialplan?.context === TRUNK_CONTEXT ||
      callerTrunk !== undefined;

    const callId = this.idGen();
    const plan = planCall({
      callId,
      dialed,
      from: event.channel.caller?.number ?? channelId,
      trunkCall,
      callerTrunk,
      numbers,
      trunks,
      routes,
      recordAll,
    });

    const session: CallSession = {
      callId,
      bridgeId: '',
      callerChannelId: channelId,
      direction: plan.direction,
      from: plan.from,
      to: plan.to,
      trunkId: plan.trunkId,
      recording: plan.recording,
      recordingStarted: false,
      codec: null,
      state: 'created',
      startedAt: this.now(),
    };
    await this.ops.answer(channelId);
    await this.captureLegMetadata(channelId, session, false);
    session.bridgeId = await this.ops.createBridge();
    await this.ops.addToBridge(session.bridgeId, channelId);
    this.byChannel.set(channelId, session);
    this.byBridge.set(session.bridgeId, session);
    this.byCall.set(callId, session);
    this.publish('call.created', session, 'created');
    this.publish('call.ringing', session, 'ringing');

    const calleeId = await this.ops.originate({
      endpoint: plan.calleeEndpoint,
      app: this.appName,
      appArgs: ['dialed', session.bridgeId],
      callerId: session.from,
    });
    session.calleeChannelId = calleeId;
    this.byChannel.set(calleeId, session);
  }

  /** Callee leg re-enters: answer, bridge, capture media, start recording. */
  private async onCalleeEntered(
    channelId: string,
    bridgeId: string | undefined,
  ): Promise<void> {
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
    await this.captureLegMetadata(channelId, session, true);
    if (session.recording !== null) {
      await this.ops.startBridgeRecording(session.bridgeId, session.callId);
      session.recordingStarted = true;
    }
    this.publish('call.answered', session, 'answered');
  }

  /** Either leg hangs up: stop recording, tear the bridge down, end the other leg. */
  async onHangup(channelId: string, cause: string): Promise<void> {
    const session = this.byChannel.get(channelId);
    if (!session) {
      return;
    }
    const otherLeg =
      channelId === session.callerChannelId
        ? session.calleeChannelId
        : session.callerChannelId;

    if (session.recordingStarted) {
      await this.safe(
        () => this.ops.stopRecording(session.callId),
        'stop recording',
      );
    }
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
    this.byCall.delete(session.callId);

    this.publish('call.ended', session, 'ended', {
      ended_at: this.now(),
      hangup_cause: cause,
    });
  }

  /**
   * Start or stop recording a live call (feature 24, the in-call Record toggle).
   * Returns the updated call snapshot, or null when the call is not currently live.
   */
  async setRecording(callId: string, enabled: boolean): Promise<Call | null> {
    const session = this.byCall.get(callId);
    if (session === undefined) {
      return null;
    }
    if (enabled && !session.recordingStarted) {
      if (session.recording === null) {
        session.recording = `${session.callId}.wav`;
      }
      await this.ops.startBridgeRecording(session.bridgeId, session.callId);
      session.recordingStarted = true;
    } else if (!enabled && session.recordingStarted) {
      await this.safe(
        () => this.ops.stopRecording(session.callId),
        'stop recording',
      );
      session.recordingStarted = false;
    }
    const call = this.buildCall(session, session.state);
    this.bus.publish({
      type: 'call.state_changed',
      at: this.now(),
      call,
      state: session.state,
    });
    return call;
  }

  /** Read a leg's SIP Call-ID (for trace attribution) and, optionally, its codec. */
  private async captureLegMetadata(
    channelId: string,
    session: CallSession,
    readCodec: boolean,
  ): Promise<void> {
    const sipCallId = await this.ops.getChannelVar(
      channelId,
      'CHANNEL(pjsip,call-id)',
    );
    if (sipCallId !== undefined) {
      this.registerCallId(session.callId, sipCallId);
    }
    if (readCodec) {
      const format = await this.ops.getChannelVar(
        channelId,
        'CHANNEL(audionativeformat)',
      );
      if (format !== undefined) {
        session.codec = normalizeCodec(format);
      }
    }
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

  private buildCall(
    session: CallSession,
    state: CallState,
    extra?: { ended_at?: string; hangup_cause?: string },
  ): Call {
    return {
      id: session.callId,
      direction: session.direction,
      from_number: session.from,
      to_number: session.to,
      trunk_id: session.trunkId,
      state,
      started_at: session.startedAt,
      answered_at: session.answeredAt ?? null,
      ended_at: extra?.ended_at ?? null,
      hangup_cause: extra?.hangup_cause ?? null,
      codec: session.codec,
      recording: session.recordingStarted ? session.recording : null,
    };
  }

  private publish(
    type: 'call.created' | 'call.ringing' | 'call.answered' | 'call.ended',
    session: CallSession,
    state: CallState,
    extra?: { ended_at?: string; hangup_cause?: string },
  ): void {
    session.state = state;
    this.bus.publish({
      type,
      at: this.now(),
      call: this.buildCall(session, state, extra),
    });
  }
}
