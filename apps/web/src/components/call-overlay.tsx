// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react';
import { useCallEventBridge } from '@/features/softphone/call-events';
import { IncomingCall } from '@/features/softphone/incoming-call';
import { useRingtone } from '@/features/softphone/ringtone';
import { useSoftphoneStore } from '@/stores/softphone';

// The global incoming-call overlay: a fixed top-right pile of cards that floats
// above every screen, driven by the softphone store (fed by the event stream
// via the bridge). A polite live region announces new calls to screen readers.
// It is always mounted in the shell and renders nothing while no call is
// ringing.

export function CallOverlay(): ReactNode {
  useCallEventBridge();
  const incoming = useSoftphoneStore((state) => state.incoming);
  useRingtone(incoming.length > 0);
  const latest = incoming.at(-1);

  return (
    <>
      <div role="status" aria-live="assertive" className="sr-only">
        {latest === undefined ? '' : `Incoming call from ${latest.from}`}
      </div>
      <div className="fixed right-4 top-16 z-50 flex flex-col gap-2">
        {incoming.map((call) => (
          <IncomingCall key={call.id} call={call} />
        ))}
      </div>
    </>
  );
}
