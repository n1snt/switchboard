// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import type { Route } from '@switchboard/shared';
import { matchRoute, patternMatches } from './match';

function route(partial: Partial<Route> & Pick<Route, 'match'>): Route {
  return {
    id: `r_${partial.match}`,
    direction: 'outbound',
    destination: 'softphone',
    priority: 100,
    ...partial,
  };
}

describe('patternMatches', () => {
  it('matches an exact string', () => {
    expect(patternMatches('+14155550123', '+14155550123')).toBe(true);
    expect(patternMatches('+14155550123', '+14155550124')).toBe(false);
  });

  it('matches a * wildcard for any run of characters', () => {
    expect(patternMatches('+1415*', '+14155550123')).toBe(true);
    expect(patternMatches('+1415*', '+16505550123')).toBe(false);
  });

  it('matches a ? wildcard for a single character', () => {
    expect(patternMatches('100?', '1001')).toBe(true);
    expect(patternMatches('100?', '10012')).toBe(false);
  });

  it('escapes regex metacharacters in the pattern', () => {
    expect(patternMatches('a.b', 'axb')).toBe(false);
    expect(patternMatches('a.b', 'a.b')).toBe(true);
  });
});

describe('matchRoute', () => {
  it('returns undefined when nothing matches', () => {
    expect(
      matchRoute([route({ match: '999' })], 'outbound', '111'),
    ).toBeUndefined();
  });

  it('filters by direction', () => {
    const inbound = route({ match: '*', direction: 'inbound' });
    expect(matchRoute([inbound], 'outbound', '111')).toBeUndefined();
    expect(matchRoute([inbound], 'inbound', '111')?.direction).toBe('inbound');
  });

  it('prefers the lowest priority among matches', () => {
    const routes = [
      route({ match: '*', destination: 'a', priority: 50 }),
      route({ match: '*', destination: 'b', priority: 10 }),
    ];
    expect(matchRoute(routes, 'outbound', 'x')?.destination).toBe('b');
  });

  it('keeps input order on a priority tie', () => {
    const routes = [
      route({ match: '*', destination: 'first', priority: 10 }),
      route({ match: '*', destination: 'second', priority: 10 }),
    ];
    expect(matchRoute(routes, 'outbound', 'x')?.destination).toBe('first');
  });
});
