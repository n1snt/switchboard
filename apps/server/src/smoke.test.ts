// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { smoke } from './smoke';

describe('server smoke', () => {
  it('includes the version', () => {
    expect(smoke()).toMatch(/^server \d+\.\d+\.\d+/);
  });
});
