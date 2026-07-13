// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { CALL_EXAMPLE, type Call } from '@switchboard/shared';
import { describe, expect, it } from 'vitest';
import { buildTimeline } from './timeline';

describe('buildTimeline', () => {
  it('builds started, answered and ended entries with offsets', () => {
    expect(buildTimeline(CALL_EXAMPLE)).toEqual([
      { label: 'Started', at: '2026-07-13T10:02:00.000Z', offset: 0 },
      { label: 'Answered', at: '2026-07-13T10:02:02.100Z', offset: 2.1 },
      { label: 'Ended', at: '2026-07-13T10:02:44.000Z', offset: 44 },
    ]);
  });

  it('only has the started entry for a call that never connected or ended', () => {
    const call: Call = {
      ...CALL_EXAMPLE,
      answered_at: null,
      ended_at: null,
    };
    expect(buildTimeline(call)).toEqual([
      { label: 'Started', at: '2026-07-13T10:02:00.000Z', offset: 0 },
    ]);
  });
});
