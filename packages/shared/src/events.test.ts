// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { CallEventSchema } from './events';
import type { CallEvent } from './events';
import { CALL_EXAMPLE } from './schemas/call';

const at = '2026-07-13T10:02:00.000Z';

describe('CallEventSchema', () => {
  it('parses every lifecycle event type', () => {
    const events: CallEvent[] = [
      { type: 'call.created', at, call: CALL_EXAMPLE },
      { type: 'call.ringing', at, call: CALL_EXAMPLE },
      { type: 'call.answered', at, call: CALL_EXAMPLE },
      { type: 'call.ended', at, call: CALL_EXAMPLE },
      { type: 'call.state_changed', at, call: CALL_EXAMPLE, state: 'answered' },
    ];
    for (const event of events) {
      expect(CallEventSchema.parse(event).type).toBe(event.type);
    }
  });

  it('rejects an unknown event type', () => {
    expect(
      CallEventSchema.safeParse({
        type: 'call.exploded',
        at,
        call: CALL_EXAMPLE,
      }).success,
    ).toBe(false);
  });

  it('requires the state field on state_changed', () => {
    expect(
      CallEventSchema.safeParse({
        type: 'call.state_changed',
        at,
        call: CALL_EXAMPLE,
      }).success,
    ).toBe(false);
  });
});
