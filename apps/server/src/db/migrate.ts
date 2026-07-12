// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { sql } from 'kysely';
import type { Db } from './index';
import { migrations } from './migrations';

/**
 * Run any not-yet-applied migrations in order, each inside its own transaction,
 * recording it in the `migrations` table so re-running is a no-op. Called once at
 * server boot before Fastify starts listening. Returns the names actually run.
 */
export async function migrate(db: Db): Promise<string[]> {
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `.execute(db);

  const appliedRows = await db
    .selectFrom('migrations')
    .select('name')
    .execute();
  const applied = new Set(appliedRows.map((row) => row.name));

  const ran: string[] = [];
  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      continue;
    }
    await db.transaction().execute(async (trx) => {
      await migration.up(trx);
      await trx
        .insertInto('migrations')
        .values({ name: migration.name, applied_at: new Date().toISOString() })
        .execute();
    });
    ran.push(migration.name);
  }
  return ran;
}
