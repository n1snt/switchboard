// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Db } from '../../db';

// The `settings` key-value table: one row per setting, value stored as JSON text.

export class SettingsRepo {
  constructor(private readonly db: Db) {}

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('settings')
      .select(['key', 'value'])
      .execute();
    const out: Record<string, unknown> = {};
    for (const row of rows) {
      out[row.key] = JSON.parse(row.value);
    }
    return out;
  }

  async set(key: string, value: unknown): Promise<void> {
    const row = {
      key,
      value: JSON.stringify(value),
      updated_at: new Date().toISOString(),
    };
    await this.db
      .insertInto('settings')
      .values(row)
      .onConflict((oc) =>
        oc
          .column('key')
          .doUpdateSet({ value: row.value, updated_at: row.updated_at }),
      )
      .execute();
  }
}
