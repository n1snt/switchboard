// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { AddressInfo } from 'node:net';
import type { CallEvent } from '@switchboard/shared';
import { CALL_EXAMPLE } from '@switchboard/shared';
import { createTestApp, type TestApp } from '../testing/harness';
import type { EventBus } from './bus';

const event: CallEvent = {
  type: 'call.created',
  at: '2026-07-13T10:02:00.000Z',
  call: CALL_EXAMPLE,
};

let harness: TestApp;
let bus: EventBus;
let url: string;

beforeAll(async () => {
  harness = await createTestApp();
  bus = harness.bus;
  await harness.app.listen({ host: '127.0.0.1', port: 0 });
  const { port } = harness.app.server.address() as AddressInfo;
  url = `ws://127.0.0.1:${port}/api/v1/events`;
});

afterAll(async () => {
  await harness.close();
});

function once<T>(socket: WebSocket, resolve: (value: T) => void): void {
  socket.once('message', (data: Buffer) =>
    resolve(JSON.parse(data.toString()) as T),
  );
}

describe('event stream WebSocket', () => {
  it('delivers a published event as JSON to a connected client', async () => {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve) => socket.once('open', () => resolve()));

    const received = new Promise<CallEvent>((resolve) => once(socket, resolve));
    bus.publish(event);
    expect(await received).toEqual(event);

    socket.close();
  });

  it('cleans up the bus subscription when a client disconnects', async () => {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve) => socket.once('open', () => resolve()));
    expect(bus.listenerCount()).toBeGreaterThan(0);

    socket.close();
    await new Promise<void>((resolve) => socket.once('close', () => resolve()));
    // The server-side close handler runs just after; poll briefly.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(bus.listenerCount()).toBe(0);
  });
});
