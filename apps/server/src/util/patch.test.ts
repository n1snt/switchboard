// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { applyUpdate } from './patch';

describe('applyUpdate', () => {
  const base = { a: 1, b: 'x', c: true };

  it('overrides only the provided keys', () => {
    expect(applyUpdate(base, { b: 'y' })).toEqual({ a: 1, b: 'y', c: true });
  });

  it('ignores keys whose value is undefined', () => {
    expect(applyUpdate(base, { b: undefined, a: 2 })).toEqual({
      a: 2,
      b: 'x',
      c: true,
    });
  });

  it('returns a copy, leaving the base untouched', () => {
    const result = applyUpdate(base, { a: 9 });
    expect(result).not.toBe(base);
    expect(base.a).toBe(1);
  });
});
