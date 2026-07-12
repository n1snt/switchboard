// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import type { Client } from 'ari-client';
import type { CallEvent } from '@switchboard/shared';
import { EventBus } from '../events/bus';
import type { Logger } from '../logger';
import { createAri } from './index';

const logger: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const flush = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

function makeClient() {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
  const client = {
    on: (event: string, cb: (...args: unknown[]) => void) => {
      const arr = listeners.get(event) ?? [];
      arr.push(cb);
      listeners.set(event, arr);
    },
    removeListener: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    channels: {
      answer: vi.fn().mockResolvedValue(undefined),
      hangup: vi.fn().mockResolvedValue(undefined),
      originate: vi.fn().mockResolvedValue({ id: 'callee-1' }),
    },
    bridges: {
      create: vi.fn().mockResolvedValue({ id: 'bridge-1' }),
      destroy: vi.fn().mockResolvedValue(undefined),
      addChannel: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as Client;
  const emit = (event: string, ...args: unknown[]): void => {
    for (const cb of listeners.get(event) ?? []) cb(...args);
  };
  return { client, emit };
}

describe('createAri', () => {
  it('wires the coordinator so a StasisStart bridges a call end to end', async () => {
    const { client, emit } = makeClient();
    const bus = new EventBus();
    const events: CallEvent[] = [];
    bus.subscribe((event) => events.push(event));

    const ari = createAri({
      connect: vi.fn().mockResolvedValue(client),
      appName: 'switchboard',
      bus,
      logger,
      now: () => '2026-07-13T10:00:00.000Z',
      idGen: () => 'call-1',
    });
    await ari.start();
    expect(ari.getStatus()).toBe('connected');

    emit('StasisStart', {
      type: 'StasisStart',
      args: [],
      channel: {
        id: 'caller-1',
        dialplan: { exten: '1002' },
        caller: { number: '1001' },
      },
    });
    await flush();

    expect(client.bridges.create).toHaveBeenCalledWith({ type: 'mixing' });
    expect(client.channels.originate).toHaveBeenCalled();
    expect(events.map((e) => e.type)).toEqual(['call.created', 'call.ringing']);
  });

  it('works with default clock and id generator', async () => {
    const { client, emit } = makeClient();
    const bus = new EventBus();
    const events: CallEvent[] = [];
    bus.subscribe((event) => events.push(event));

    const ari = createAri({
      connect: vi.fn().mockResolvedValue(client),
      appName: 'switchboard',
      bus,
      logger,
    });
    await ari.start();
    emit('StasisStart', {
      type: 'StasisStart',
      args: [],
      channel: { id: 'caller-1', dialplan: { exten: '1002' } },
    });
    await flush();
    expect(events[0]?.type).toBe('call.created');
  });
});
