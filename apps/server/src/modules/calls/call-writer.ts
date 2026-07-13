// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { CallEvent } from '@switchboard/shared';
import type { EventBus } from '../../events/bus';
import type { Logger } from '../../logger';
import type { CallRepo } from './calls.repo';

// Feature 21: the call log's writer. Every lifecycle event carries the full call
// snapshot, so persistence is a single upsert per event, keyed by call id. This
// is one of the event bus's independent subscribers (alongside the WS stream and,
// later, webhooks).
export class CallWriter {
  constructor(
    private readonly repo: CallRepo,
    private readonly logger: Logger,
  ) {}

  /** Subscribe to the bus; returns an unsubscribe function. */
  subscribe(bus: EventBus): () => void {
    return bus.subscribe((event) => {
      this.persist(event);
    });
  }

  private persist(event: CallEvent): void {
    void this.repo.upsert(event.call).catch((err: unknown) => {
      this.logger.error(
        `calls: failed to persist ${event.call.id}: ${String(err)}`,
      );
    });
  }
}
