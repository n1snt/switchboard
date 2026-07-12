// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { AddressInfo } from 'node:net';
import type { FastifyInstance } from 'fastify';
import type { CallEvent } from '@switchboard/shared';
import { CALL_EXAMPLE } from '@switchboard/shared';
import { buildApp } from '../app';
import { loadConfig } from '../config';
import { EventBus } from './bus';

const event: CallEvent = {
  type: 'call.created',
  at: '2026-07-13T10:02:00.000Z',
  call: CALL_EXAMPLE,
};

let app: FastifyInstance;
let bus: EventBus;
let url: string;

beforeAll(async () => {
  bus = new EventBus();
  app = await buildApp({ config: loadConfig({}), bus });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const { port } = app.server.address() as AddressInfo;
  url = `ws://127.0.0.1:${port}/api/v1/events`;
});

afterAll(async () => {
  await app.close();
});

function once<T>(socket: WebSocket, resolve: (value: T) => void): void {
  socket.once('message', (data: Buffer) => resolve(JSON.parse(data.toString()) as T));
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
