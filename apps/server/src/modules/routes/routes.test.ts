// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Route } from '@switchboard/shared';
import { createTestApp, type TestApp } from '../../testing/harness';

let harness: TestApp;

beforeEach(async () => {
  harness = await createTestApp();
});

afterEach(async () => {
  await harness.close();
});

function createRoute(payload: Record<string, unknown>) {
  return harness.app.inject({ method: 'POST', url: '/api/v1/routes', payload });
}

describe('routes HTTP', () => {
  it('creates a route with a default priority', async () => {
    const res = await createRoute({
      direction: 'outbound',
      match: '+1415*',
      destination: 'softphone',
    });
    expect(res.statusCode).toBe(201);
    const route = res.json<Route>();
    expect(route.id).toMatch(/^route_/);
    expect(route.priority).toBe(100);
  });

  it('rejects an invalid route', async () => {
    expect(
      (await createRoute({ direction: 'outbound', destination: 'softphone' }))
        .statusCode,
    ).toBe(400);
  });

  it('lists, gets, updates, and deletes', async () => {
    const id = (
      await createRoute({
        direction: 'inbound',
        match: '999',
        destination: 'trunk_1',
      })
    ).json<Route>().id;
    expect(
      (await harness.app.inject({ method: 'GET', url: '/api/v1/routes' })).json<
        Route[]
      >(),
    ).toHaveLength(1);
    expect(
      (await harness.app.inject({ method: 'GET', url: `/api/v1/routes/${id}` }))
        .statusCode,
    ).toBe(200);
    const patched = await harness.app.inject({
      method: 'PATCH',
      url: `/api/v1/routes/${id}`,
      payload: { priority: 5 },
    });
    expect(patched.json<Route>().priority).toBe(5);
    expect(
      (
        await harness.app.inject({
          method: 'DELETE',
          url: `/api/v1/routes/${id}`,
        })
      ).statusCode,
    ).toBe(204);
  });

  it('404s unknown ids', async () => {
    expect(
      (await harness.app.inject({ method: 'GET', url: '/api/v1/routes/nope' }))
        .statusCode,
    ).toBe(404);
    expect(
      (
        await harness.app.inject({
          method: 'PATCH',
          url: '/api/v1/routes/nope',
          payload: { priority: 1 },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await harness.app.inject({
          method: 'DELETE',
          url: '/api/v1/routes/nope',
        })
      ).statusCode,
    ).toBe(404);
  });
});
