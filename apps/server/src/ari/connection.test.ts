// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from 'ari-client';
import type { Logger } from '../logger';
import { AriConnection } from './connection';

const logger: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

function makeClient() {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
  const on = vi.fn((event: string, cb: (...args: unknown[]) => void) => {
    const arr = listeners.get(event) ?? [];
    arr.push(cb);
    listeners.set(event, arr);
  });
  const client = {
    on,
    removeListener: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    channels: {},
    bridges: {},
  } as unknown as Client;
  const emit = (event: string, ...args: unknown[]): void => {
    for (const cb of listeners.get(event) ?? []) cb(...args);
  };
  return { client, emit };
}

beforeEach(() => vi.clearAllMocks());

describe('AriConnection', () => {
  it('connects, joins the app, and registers handlers', async () => {
    const { client, emit } = makeClient();
    const stasisStart = vi.fn();
    const conn = new AriConnection({
      connect: vi.fn().mockResolvedValue(client),
      appName: 'switchboard',
      logger,
      onConnect: () => ({ StasisStart: stasisStart }),
    });

    await conn.start();
    expect(conn.getStatus()).toBe('connected');
    expect(client.start).toHaveBeenCalledWith('switchboard');

    emit('StasisStart', { type: 'StasisStart' });
    expect(stasisStart).toHaveBeenCalledWith({ type: 'StasisStart' });
  });

  it('reflects the websocket lifecycle into the engine status', async () => {
    const { client, emit } = makeClient();
    const conn = new AriConnection({
      connect: vi.fn().mockResolvedValue(client),
      appName: 'sb',
      logger,
      onConnect: () => ({}),
    });
    await conn.start();

    emit('WebSocketReconnecting');
    expect(conn.getStatus()).toBe('connecting');
    emit('WebSocketConnected');
    expect(conn.getStatus()).toBe('connected');
    emit('WebSocketMaxRetries');
    expect(conn.getStatus()).toBe('disconnected');
  });

  it('retries the initial connection with the injected scheduler', async () => {
    const { client } = makeClient();
    const scheduled: (() => void)[] = [];
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error('engine not up'))
      .mockResolvedValueOnce(client);
    const conn = new AriConnection({
      connect,
      appName: 'sb',
      logger,
      onConnect: () => ({}),
      schedule: (cb) => scheduled.push(cb),
    });

    await conn.start();
    expect(conn.getStatus()).toBe('connecting');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('connect failed'));
    expect(scheduled).toHaveLength(1);

    scheduled[0]?.();
    await flush();
    expect(connect).toHaveBeenCalledTimes(2);
    expect(conn.getStatus()).toBe('connected');
  });

  it('stops retrying once stopped', async () => {
    const scheduled: (() => void)[] = [];
    const connect = vi.fn().mockRejectedValue(new Error('always down'));
    const conn = new AriConnection({
      connect,
      appName: 'sb',
      logger,
      onConnect: () => ({}),
      schedule: (cb) => scheduled.push(cb),
    });

    await conn.start();
    conn.stop();
    expect(conn.getStatus()).toBe('disconnected');
    scheduled[0]?.();
    await flush();
    expect(connect).toHaveBeenCalledTimes(2);
    expect(scheduled).toHaveLength(1); // no further retry scheduled
  });

  it('stops a connected client', async () => {
    const { client } = makeClient();
    const conn = new AriConnection({
      connect: vi.fn().mockResolvedValue(client),
      appName: 'sb',
      logger,
      onConnect: () => ({}),
    });
    await conn.start();
    conn.stop();
    expect(client.stop).toHaveBeenCalledOnce();
    expect(conn.getStatus()).toBe('disconnected');
  });
});

describe('AriConnection default scheduler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('uses a real (unref) timer when none is injected', async () => {
    const { client } = makeClient();
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce(client);
    const conn = new AriConnection({
      connect,
      appName: 'sb',
      logger,
      onConnect: () => ({}),
      retryBaseMs: 10,
    });

    await conn.start();
    await vi.advanceTimersByTimeAsync(20);
    expect(conn.getStatus()).toBe('connected');
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
