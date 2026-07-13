// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { SipTraceEntry } from '@switchboard/shared';

// Where the call detail endpoint reads a call's SIP ladder from (feature 23).
// The engine capture parses Asterisk's PJSIP logger output (sip-trace-parser.ts)
// and records entries here; the detail endpoint reads them back.
export interface SipTraceStore {
  get(callId: string): Promise<SipTraceEntry[]>;
}

/** An in-memory trace store, keyed by call id. */
export class InMemorySipTraceStore implements SipTraceStore {
  private readonly byCall = new Map<string, SipTraceEntry[]>();

  get(callId: string): Promise<SipTraceEntry[]> {
    return Promise.resolve(this.byCall.get(callId) ?? []);
  }

  /** Replace the trace for a call (called by the engine capture). */
  record(callId: string, entries: SipTraceEntry[]): void {
    this.byCall.set(callId, entries);
  }
}
