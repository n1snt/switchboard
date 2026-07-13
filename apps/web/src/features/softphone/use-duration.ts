// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';

// A ticking elapsed-seconds counter for the in-call duration timer. Split from
// the display so the pure elapsed calculation is trivially tested and the
// interval is a thin, isolated seam.

/** Whole seconds elapsed since `since` (epoch ms), clamped at zero. */
export function elapsedSeconds(since: number | null, now: number): number {
  if (since === null) {
    return 0;
  }
  return Math.max(0, Math.floor((now - since) / 1000));
}

/** Elapsed seconds since `since`, updating every second while it is set. */
export function useElapsedSeconds(since: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (since === null) {
      return;
    }
    setNow(Date.now());
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [since]);

  return elapsedSeconds(since, now);
}
