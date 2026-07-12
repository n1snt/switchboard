// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import type { CallEvent } from '@switchboard/shared';
import { CALL_EXAMPLE } from '@switchboard/shared';
import { EventBus } from './bus';

const event: CallEvent = {
  type: 'call.created',
  at: '2026-07-13T10:02:00.000Z',
  call: CALL_EXAMPLE,
};

describe('EventBus', () => {
  it('delivers a published event to every subscriber', () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe(a);
    bus.subscribe(b);
    bus.publish(event);
    expect(a).toHaveBeenCalledWith(event);
    expect(b).toHaveBeenCalledWith(event);
  });

  it('stops delivering after unsubscribe', () => {
    const bus = new EventBus();
    const listener = vi.fn();
    const off = bus.subscribe(listener);
    off();
    bus.publish(event);
    expect(listener).not.toHaveBeenCalled();
    expect(bus.listenerCount()).toBe(0);
  });
});
