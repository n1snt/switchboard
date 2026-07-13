// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import type { CallEvent, CallEventType } from '@switchboard/shared';
import { CALL_EXAMPLE } from '@switchboard/shared';
import { EventBus } from '../../events/bus';
import { SipTraceCapture } from './sip-trace-capture';
import { InMemorySipTraceStore } from './trace-store';

const INVITE =
  '<--- Received SIP request --->\nINVITE sip:1002@switchboard SIP/2.0\n';

function event(type: CallEventType, id: string): CallEvent {
  return {
    type,
    at: '2026-07-13T10:00:00.000Z',
    call: { ...CALL_EXAMPLE, id },
  } as CallEvent;
}

describe('SipTraceCapture', () => {
  it('buffers the PJSIP log during a call and records the ladder on end', async () => {
    const store = new InMemorySipTraceStore();
    const bus = new EventBus();
    const capture = new SipTraceCapture(
      store,
      () => '2026-07-13T10:00:00.000Z',
    );
    capture.subscribe(bus);

    bus.publish(event('call.created', 'c1'));
    capture.feed(INVITE);
    bus.publish(event('call.ringing', 'c1'));
    bus.publish(event('call.ended', 'c1'));

    expect(await store.get('c1')).toEqual([
      {
        at: '2026-07-13T10:00:00.000Z',
        direction: 'incoming',
        method: 'INVITE',
        summary: 'INVITE sip:1002@switchboard SIP/2.0',
      },
    ]);
  });

  it('ignores text fed while no call is in flight', async () => {
    const store = new InMemorySipTraceStore();
    new SipTraceCapture(store).feed(INVITE);
    expect(await store.get('c1')).toEqual([]);
  });

  it('ignores an end for a call it never began', async () => {
    const store = new InMemorySipTraceStore();
    const bus = new EventBus();
    new SipTraceCapture(store).subscribe(bus);
    bus.publish(event('call.ended', 'ghost'));
    expect(await store.get('ghost')).toEqual([]);
  });

  it('stamps entries with a real clock by default', async () => {
    const store = new InMemorySipTraceStore();
    const bus = new EventBus();
    const capture = new SipTraceCapture(store);
    capture.subscribe(bus);
    bus.publish(event('call.created', 'c1'));
    capture.feed(INVITE);
    bus.publish(event('call.ended', 'c1'));
    expect((await store.get('c1'))[0]?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('unsubscribes cleanly', () => {
    const bus = new EventBus();
    const unsubscribe = new SipTraceCapture(
      new InMemorySipTraceStore(),
    ).subscribe(bus);
    expect(bus.listenerCount()).toBe(1);
    unsubscribe();
    expect(bus.listenerCount()).toBe(0);
  });

  it('attributes only the registered dialogs when Call-IDs are known', async () => {
    const store = new InMemorySipTraceStore();
    const bus = new EventBus();
    const capture = new SipTraceCapture(
      store,
      () => '2026-07-13T10:00:00.000Z',
    );
    capture.subscribe(bus);

    bus.publish(event('call.created', 'c1'));
    capture.registerCallId('c1', 'mine@host');
    capture.feed(
      '<--- Received SIP request --->\nINVITE sip:x SIP/2.0\nCall-ID: mine@host\n',
    );
    capture.feed(
      '<--- Received SIP request --->\nINVITE sip:y SIP/2.0\nCall-ID: other@host\n',
    );
    bus.publish(event('call.ended', 'c1'));

    const trace = await store.get('c1');
    expect(trace).toHaveLength(1);
    expect(trace[0]?.summary).toBe('INVITE sip:x SIP/2.0');
  });
});
