// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef } from 'react';
import type { CallEvent } from '@switchboard/shared';
import { useCallEvents } from '@/lib/ws';
import { useSoftphoneStore, type SoftphoneStore } from '@/stores/softphone';

// Bridges the server's call-event stream (lib/ws) into the softphone store. A
// call the system-under-test placed arrives as the data-model `outbound`
// direction, which the dashboard shows as an incoming call: those raise the
// notification card. The answered event carries the negotiated codec, and an
// ended event clears a still-ringing incoming card (the caller cancelled).
//
// A call the softphone placed is data-model `inbound`. The store's activeCall
// has no server id yet at that point (it's only set locally by placeCall), so
// early lifecycle events correlate the server's call.id onto it, letting a
// per-call action like recording target the right call.

/** Apply a single call event to the store. Pure over the passed store slice. */
export function applyCallEvent(event: CallEvent, store: SoftphoneStore): void {
  const { call } = event;

  if (call.direction === 'inbound') {
    if (
      event.type === 'call.created' ||
      event.type === 'call.ringing' ||
      event.type === 'call.answered'
    ) {
      store.linkActiveCall(call.id);
    }
  }

  if (event.type === 'call.answered') {
    store.setCodec(call.codec);
    return;
  }

  // Only calls the softphone receives (data-model outbound) drive the incoming
  // notification; calls it placed are driven by the local SIP session.
  if (call.direction !== 'outbound') {
    return;
  }

  if (event.type === 'call.ringing') {
    const alreadyQueued = store.incoming.some((entry) => entry.id === call.id);
    if (!alreadyQueued) {
      store.receiveIncoming({
        id: call.id,
        from: call.from_number,
        via: call.trunk_id ?? 'unknown',
      });
    }
  } else if (event.type === 'call.ended') {
    store.removeIncoming(call.id);
  }
}

/**
 * Subscribe the store to the call-event stream. Mounted once in the shell so
 * the incoming-call overlay works on every route. Each event is applied exactly
 * once, tracked by how many have already been processed.
 */
export function useCallEventBridge(): void {
  const events = useCallEvents();
  const processed = useRef(0);

  useEffect(() => {
    const store = useSoftphoneStore.getState();
    for (const event of events.slice(processed.current)) {
      applyCallEvent(event, store);
    }
    processed.current = events.length;
  }, [events]);
}
