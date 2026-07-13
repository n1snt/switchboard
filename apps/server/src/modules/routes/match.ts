// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Route, RouteDirection } from '@switchboard/shared';

// Pure routing logic the call features call. Kept separate from CRUD because it
// is central and easy to test exhaustively.

/**
 * Does a route's match pattern cover the dialed string? An exact string always
 * matches; otherwise `*` matches any run of characters and `?` matches one.
 */
export function patternMatches(pattern: string, value: string): boolean {
  if (pattern === value) {
    return true;
  }
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`).test(value);
}

/**
 * The best route for a dialed string in a direction: among matching routes, the
 * lowest priority wins; ties keep input order. Returns undefined when none match.
 */
export function matchRoute(
  routes: Route[],
  direction: RouteDirection,
  dialed: string,
): Route | undefined {
  return routes
    .filter(
      (route) =>
        route.direction === direction && patternMatches(route.match, dialed),
    )
    .sort((a, b) => a.priority - b.priority)[0];
}
