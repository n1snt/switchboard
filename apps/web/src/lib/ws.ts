// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import { CallEventSchema, type CallEvent } from '@switchboard/shared';

// The dashboard subscribes to the server's call-event stream over a WebSocket.
// The URL is relative to the current origin (derived from window.location), so
// it works behind the nginx proxy and the Vite dev proxy alike. Every frame is
// validated with the shared schema; malformed frames are ignored, never thrown.

/** Just the parts of `window.location` this module reads. */
export interface WsLocation {
  protocol: string;
  host: string;
}

/** Derive the events WebSocket URL from a location, upgrading https to wss. */
export function eventsWsUrl(location: WsLocation): string {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${location.host}/api/v1/events`;
}

/**
 * Parse one raw WebSocket frame into a call event. Returns null (rather than
 * throwing) for non-JSON text or a payload that does not match the event union,
 * so a bad frame can never crash a subscriber.
 */
export function parseCallEvent(raw: unknown): CallEvent | null {
  let candidate: unknown = raw;
  if (typeof raw === 'string') {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const result = CallEventSchema.safeParse(candidate);
  return result.success ? result.data : null;
}

/**
 * Subscribe to the call-event stream. Returns the events received so far, in
 * arrival order. The socket is opened once and closed on unmount.
 */
export function useCallEvents(): readonly CallEvent[] {
  const [events, setEvents] = useState<readonly CallEvent[]>([]);

  useEffect(() => {
    const socket = new WebSocket(eventsWsUrl(window.location));
    socket.onmessage = (message: MessageEvent) => {
      const event = parseCallEvent(message.data);
      if (event) {
        setEvents((previous) => [...previous, event]);
      }
    };
    return () => {
      socket.close();
    };
  }, []);

  return events;
}
