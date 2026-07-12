// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { SipjsAdapter } from './sipjsAdapter';

// The real adapter is a browser/media seam excluded from coverage (see the v8
// ignore banner in the file). This test only confirms the module loads and the
// class is exported, so the ignore hint is applied through the transform.

describe('SipjsAdapter module', () => {
  it('exports the adapter class', () => {
    expect(SipjsAdapter).toBeTypeOf('function');
  });
});
