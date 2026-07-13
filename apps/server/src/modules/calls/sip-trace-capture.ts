// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { EventBus } from '../../events/bus';
import { parseSipTrace } from './sip-trace-parser';
import type { InMemorySipTraceStore } from './trace-store';

// Feature 23: the runtime half of the SIP trace. Asterisk's PJSIP logger output
// is fed in as raw text (from the engine log source, ari/pjsip-log-source.ts);
// this attributes it to the calls in flight and, when a call ends, parses the
// text it accumulated during the call into the trace store the detail endpoint
// reads. In the single-user localhost sandbox (CLAUDE.md, "First version scope")
// a call at a time is the norm, so a live call simply accumulates every message
// logged during its window; concurrent calls share the window's text.
export class SipTraceCapture {
  private readonly open = new Map<string, string>();

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

  private commit(callId: string): void {
    const raw = this.open.get(callId);
    if (raw === undefined) {
      return;
    }
    this.open.delete(callId);
    this.store.record(callId, parseSipTrace(raw, { now: this.now }));
  }
}
