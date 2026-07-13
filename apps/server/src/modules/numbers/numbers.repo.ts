// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { PhoneNumber } from '@switchboard/shared';
import type { Db } from '../../db';
import type { NumbersTable } from '../../db/schema';

// The only code that queries the `numbers` table.

function rowToNumber(row: NumbersTable): PhoneNumber {
  return {
    id: row.id,
    e164: row.e164,
    trunk_id: row.trunk_id,
    label: row.label ?? undefined,
  };
}

function numberToRow(n: PhoneNumber): NumbersTable {
  return {
    id: n.id,
    e164: n.e164,
    trunk_id: n.trunk_id,
    label: n.label ?? null,
  };
}

export class NumberRepo {
  constructor(private readonly db: Db) {}

  async list(): Promise<PhoneNumber[]> {
    const rows = await this.db
      .selectFrom('numbers')
      .selectAll()
      .orderBy('e164')
      .execute();
    return rows.map(rowToNumber);
  }

  async get(id: string): Promise<PhoneNumber | undefined> {
    const row = await this.db
      .selectFrom('numbers')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? rowToNumber(row) : undefined;
  }

  async insert(n: PhoneNumber): Promise<void> {
    await this.db.insertInto('numbers').values(numberToRow(n)).execute();
  }

  async replace(n: PhoneNumber): Promise<void> {
    const { id, ...rest } = numberToRow(n);
    await this.db
      .updateTable('numbers')
      .set(rest)
      .where('id', '=', id)
      .execute();
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('numbers')
      .where('id', '=', id)
      .executeTakeFirst();
    return result.numDeletedRows > 0n;
  }
}
