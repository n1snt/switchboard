// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter } from 'node:events';
import type { CallEvent } from '@switchboard/shared';

// The one place call state changes are announced. A tiny typed wrapper over
// EventEmitter carrying the shared CallEvent union. Designed for many independent
// subscribers from the start: the WS stream (feature 8), the call-table writer
// (feature 21), and webhooks (feature 31).

export type CallEventListener = (event: CallEvent) => void;

export class EventBus {
  private readonly emitter = new EventEmitter();
  private static readonly CHANNEL = 'call';

  constructor() {
    // Many subscribers (one per WS client plus internal consumers); lifting the
    // default cap avoids spurious max-listeners warnings.
    this.emitter.setMaxListeners(0);
  }

  /** Announce a call lifecycle event to every subscriber. */
  publish(event: CallEvent): void {
    this.emitter.emit(EventBus.CHANNEL, event);
  }

  /** Subscribe to call events; returns an unsubscribe function. */
  subscribe(listener: CallEventListener): () => void {
    this.emitter.on(EventBus.CHANNEL, listener);
    return () => {
      this.emitter.off(EventBus.CHANNEL, listener);
    };
  }

  /** Current subscriber count (used by tests and diagnostics). */
  listenerCount(): number {
    return this.emitter.listenerCount(EventBus.CHANNEL);
  }
}
