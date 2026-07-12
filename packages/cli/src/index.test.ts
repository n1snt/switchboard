// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { banner } from './index';

describe('cli banner', () => {
  it('includes the version', () => {
    expect(banner()).toMatch(/^switchboard \d+\.\d+\.\d+/);
  });
});
