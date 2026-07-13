// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { z } from 'zod';
import type { CallListQuerySchema } from '@switchboard/shared';
import type { Call, CallDetail } from '@switchboard/shared';
import { notFound } from '../../plugins/errors';
import type { CallFilters, CallRepo } from './calls.repo';
import type { SipTraceStore } from './trace-store';

export type CallListQueryInput = z.infer<typeof CallListQuerySchema>;

// Reads the call log. Translates the dashboard's plain-language direction
// (placed/received) into the data model's inbound/outbound (dashboard.md).
export class CallService {
  constructor(
    private readonly repo: CallRepo,
    private readonly traceStore: SipTraceStore,
  ) {}

  list(query: CallListQueryInput): Promise<Call[]> {
    const direction =
      query.direction === 'placed'
        ? 'inbound'
        : query.direction === 'received'
          ? 'outbound'
          : undefined;
    const filters: CallFilters = {
      limit: query.limit,
      offset: query.offset,
      ...(direction ? { direction } : {}),
      ...(query.trunk_id ? { trunk_id: query.trunk_id } : {}),
      ...(query.state ? { state: query.state } : {}),
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
    };
    return this.repo.list(filters);
  }

  async get(id: string): Promise<CallDetail> {
    const call = await this.repo.get(id);
    if (!call) {
      throw notFound(`Call ${id} not found`);
    }
    return { ...call, sip_trace: await this.traceStore.get(id) };
  }
}
