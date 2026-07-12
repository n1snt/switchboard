// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { isAppRoute } from '@ts-rest/core';
import type { AppRoute, AppRouter } from '@ts-rest/core';
import { contract } from './contract';

/** Depth-first collection of every route in a (possibly nested) contract. */
function collectRoutes(router: AppRouter): AppRoute[] {
  const routes: AppRoute[] = [];
  for (const value of Object.values(router)) {
    if (isAppRoute(value)) {
      routes.push(value);
    } else {
      routes.push(...collectRoutes(value));
    }
  }
  return routes;
}

describe('contract', () => {
  const routes = collectRoutes(contract);

  it('exposes routes for every resource', () => {
    expect(routes.length).toBeGreaterThanOrEqual(24);
  });

  it('mounts every route under /api/v1', () => {
    for (const route of routes) {
      expect(route.path.startsWith('/api/v1')).toBe(true);
    }
  });

  it('gives every route a summary for the OpenAPI document', () => {
    for (const route of routes) {
      expect(route.summary, `${route.method} ${route.path}`).toBeTruthy();
    }
  });

  it('declares the error envelope on fallible endpoints', () => {
    const create = contract.trunks.create;
    expect(create.responses[400]).toBeDefined();
    expect(contract.trunks.get.responses[404]).toBeDefined();
  });
});
