// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import fastifyWebsocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import type { EventBus } from './bus';

// The dashboard's live feed: a WebSocket at /api/v1/events that streams every
// call lifecycle event from the bus as JSON. Each client is one bus subscriber;
// the subscription is torn down when the socket closes. This is also a documented
// public interface (feature 23) that other tools can consume.

export const EVENTS_PATH = '/api/v1/events';

export async function registerEventStream(
  app: FastifyInstance,
  bus: EventBus,
): Promise<void> {
  await app.register(fastifyWebsocket);
  app.get(EVENTS_PATH, { websocket: true }, (socket) => {
    const unsubscribe = bus.subscribe((event) => {
      socket.send(JSON.stringify(event));
    });
    socket.on('close', () => {
      unsubscribe();
    });
  });
}
