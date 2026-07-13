// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Call, CallDirection, CallState } from '@switchboard/shared';
import type { Db } from '../../db';
import type { CallsTable } from '../../db/schema';

export interface CallFilters {
  direction?: CallDirection;
  trunk_id?: string;
  state?: CallState;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

// direction and state are written only by the validated call writer, so reading
// them back as the domain union is safe (see the note in trunks.repo.ts).
function rowToCall(row: CallsTable): Call {
  return {
    id: row.id,
    direction: row.direction as CallDirection,
    from_number: row.from_number,
    to_number: row.to_number,
    trunk_id: row.trunk_id,
    state: row.state as CallState,
    started_at: row.started_at,
    answered_at: row.answered_at,
    ended_at: row.ended_at,
    hangup_cause: row.hangup_cause,
    codec: row.codec,
    recording: row.recording,
  };
}

function callToRow(call: Call): CallsTable {
  return { ...call };
}

export class CallRepo {
  constructor(private readonly db: Db) {}

  async list(filters: CallFilters): Promise<Call[]> {
    let query = this.db.selectFrom('calls').selectAll();
    if (filters.direction) {
      query = query.where('direction', '=', filters.direction);
    }
    if (filters.trunk_id) {
      query = query.where('trunk_id', '=', filters.trunk_id);
    }
    if (filters.state) {
      query = query.where('state', '=', filters.state);
    }
    if (filters.from) {
      query = query.where('started_at', '>=', filters.from);
    }
    if (filters.to) {
      query = query.where('started_at', '<=', filters.to);
    }
    const rows = await query
      .orderBy('started_at', 'desc')
      .limit(filters.limit)
      .offset(filters.offset)
      .execute();
    return rows.map(rowToCall);
  }

  async get(id: string): Promise<Call | undefined> {
    const row = await this.db
      .selectFrom('calls')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? rowToCall(row) : undefined;
  }

  /** Insert a call or replace it if the id already exists (feature 21 writer). */
  async upsert(call: Call): Promise<void> {
    const row = callToRow(call);
    await this.db
      .insertInto('calls')
      .values(row)
      .onConflict((oc) => oc.column('id').doUpdateSet(row))
      .execute();
  }
}
