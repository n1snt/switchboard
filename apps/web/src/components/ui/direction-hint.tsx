// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TrunkDirection } from '@switchboard/shared';

// The inbound/outbound vocabulary appears only on the Trunks and Routes config
// screens, and there it must carry a one-line tooltip explaining the direction
// (see dashboard.md). This renders that explainer as a native tooltip on an
// info icon, so the meaning is reachable by hover and by assistive tech.

/** Plain-language explanation of each system-under-test direction. */
export const DIRECTION_HINTS: Record<TrunkDirection, string> = {
  inbound: 'Inbound: the softphone places a call to your system.',
  outbound: 'Outbound: your system places a call and the softphone rings.',
  both: 'Both: the trunk can place and receive calls.',
};

export function DirectionHint({
  direction,
}: {
  direction: TrunkDirection;
}): ReactNode {
  const hint = DIRECTION_HINTS[direction];
  return (
    <Info
      className="inline h-3.5 w-3.5 text-neutral-400"
      role="img"
      aria-label={hint}
    >
      <title>{hint}</title>
    </Info>
  );
}
