// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { API_BASE_PATH, SWITCHBOARD_VERSION } from './version';

describe('version', () => {
  it('exposes a version string', () => {
    expect(SWITCHBOARD_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('mounts the API under /api/v1', () => {
    expect(API_BASE_PATH).toBe('/api/v1');
  });
});
