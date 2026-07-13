// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { useRingtone } from './ringtone';

// The ringtone is a browser audio seam excluded from coverage (see the v8
// ignore banner in the file). This only confirms the hook is exported so the
// ignore hint survives the transform.

describe('useRingtone', () => {
  it('is exported as a hook', () => {
    expect(useRingtone).toBeTypeOf('function');
  });
});
