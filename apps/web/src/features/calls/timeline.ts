// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Call } from '@switchboard/shared';

// Builds the call's state timeline from its stored timestamps: when setup
// began, when it was answered (if ever), and when it ended (if ended). Offsets
// are seconds from the start, which is what the detail view shows.

export interface TimelineEntry {
  label: string;
  at: string;
  /** Seconds since the call started, to one decimal. */
  offset: number;
}

export function buildTimeline(call: Call): TimelineEntry[] {
  const start = Date.parse(call.started_at);
  const offsetOf = (iso: string): number =>
    Math.round(Math.max(0, (Date.parse(iso) - start) / 1000) * 10) / 10;

  const entries: TimelineEntry[] = [
    { label: 'Started', at: call.started_at, offset: 0 },
  ];
  if (call.answered_at !== null) {
    entries.push({
      label: 'Answered',
      at: call.answered_at,
      offset: offsetOf(call.answered_at),
    });
  }
  if (call.ended_at !== null) {
    entries.push({
      label: 'Ended',
      at: call.ended_at,
      offset: offsetOf(call.ended_at),
    });
  }
  return entries;
}
