// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { EventBus } from '../../events/bus';
import { parseSipMessages } from './sip-trace-parser';
import type { InMemorySipTraceStore } from './trace-store';

// Feature 23: the runtime half of the SIP trace. Asterisk's PJSIP logger output
// is fed in as raw text (from the engine log source, ari/pjsip-log-source.ts);
// this attributes it to the calls in flight and, when a call ends, parses the
// text it accumulated during the call into the trace store the detail endpoint
// reads. When the coordinator has registered a call's SIP Call-IDs (learned from
// the channels over ARI), the ladder is filtered to just those dialogs, so
// concurrent calls no longer share each other's messages; with no registered
// Call-ID it falls back to attributing the whole window (the single-user default).

/** Lets the coordinator tell the capture which SIP dialogs belong to a call. */
export interface SipTraceRegistrar {
  registerCallId(callId: string, sipCallId: string): void;
}

export class SipTraceCapture implements SipTraceRegistrar {
  private readonly open = new Map<string, string>();
  private readonly sipCallIds = new Map<string, Set<string>>();

  constructor(
    private readonly store: InMemorySipTraceStore,
    private readonly now: () => string = (): string => new Date().toISOString(),
  ) {}

  /** Begin/commit buffers as calls start and end; returns an unsubscribe function. */
  subscribe(bus: EventBus): () => void {
    return bus.subscribe((event) => {
      if (event.type === 'call.created') {
        this.open.set(event.call.id, '');
      } else if (event.type === 'call.ended') {
        this.commit(event.call.id);
      }
    });
  }

  /** Append raw PJSIP logger text to every call currently in flight. */
  feed(text: string): void {
    for (const [callId, buffered] of this.open) {
      this.open.set(callId, buffered + text);
    }
  }

  /** Associate a SIP Call-ID with one of our calls, for per-dialog attribution. */
  registerCallId(callId: string, sipCallId: string): void {
    const set = this.sipCallIds.get(callId) ?? new Set<string>();
    set.add(sipCallId);
    this.sipCallIds.set(callId, set);
  }

  private commit(callId: string): void {
    const raw = this.open.get(callId);
    if (raw === undefined) {
      return;
    }
    this.open.delete(callId);
    const dialogs = this.sipCallIds.get(callId);
    this.sipCallIds.delete(callId);

    const messages = parseSipMessages(raw, { now: this.now });
    const attributed =
      dialogs === undefined
        ? messages
        : messages.filter(
            (message) =>
              message.callId !== undefined && dialogs.has(message.callId),
          );
    this.store.record(
      callId,
      attributed.map((message) => message.entry),
    );
  }
}
