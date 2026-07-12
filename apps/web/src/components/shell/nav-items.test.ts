// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from './nav-items';

describe('NAV_ITEMS', () => {
  it('lists the seven top-level destinations in order', () => {
    expect(NAV_ITEMS.map((item) => item.to)).toEqual([
      '/phone',
      '/trunks',
      '/numbers',
      '/routes',
      '/calls',
      '/faults',
      '/settings',
    ]);
  });

  it('gives every item a label and an icon', () => {
    for (const item of NAV_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.Icon).toBeTypeOf('object');
    }
  });
});
