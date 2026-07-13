// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import type { SipTraceEntry } from '@switchboard/shared';
import { InMemorySipTraceStore } from './trace-store';

const entry: SipTraceEntry = {
  at: '2026-07-13T10:00:00.000Z',
  direction: 'incoming',
  method: 'INVITE',
  summary: 'INVITE sip:1002 SIP/2.0',
};

describe('InMemorySipTraceStore', () => {
  it('returns an empty ladder for an unknown call', async () => {
    expect(await new InMemorySipTraceStore().get('nope')).toEqual([]);
  });

  it('records and returns a ladder', async () => {
    const store = new InMemorySipTraceStore();
    store.record('c1', [entry]);
    expect(await store.get('c1')).toEqual([entry]);
  });
});
