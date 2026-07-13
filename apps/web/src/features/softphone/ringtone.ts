// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

/* v8 ignore start -- browser audio seam: the Web Audio ringtone is a media
   side-effect with no deterministic unit surface, so it is isolated here and
   excluded from coverage (its only caller, the call overlay, is tested). The
   start/stop form is matched against the raw source so it survives the esbuild
   transform that strips a plain `v8 ignore file` comment. */

import { useEffect } from 'react';

// Plays a soft repeating tone while at least one incoming call is ringing. Uses
// the Web Audio API directly rather than an asset so nothing external is
// bundled. A no-op if the browser has no AudioContext.

/** Play or stop the ringtone based on whether a call is ringing. */
export function useRingtone(active: boolean): void {
  useEffect(() => {
    if (!active || typeof AudioContext === 'undefined') {
      return;
    }
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 440;
    gain.gain.value = 0.05;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    return () => {
      oscillator.stop();
      void context.close();
    };
  }, [active]);
}

/* v8 ignore stop */
