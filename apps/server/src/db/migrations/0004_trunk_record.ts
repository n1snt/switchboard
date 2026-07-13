// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Kysely } from 'kysely';
import type { Database } from '../schema';

// Feature 24 (call recording) resolves the record decision most-specific-first:
// per-call, then per-trunk default, then the global setting. This adds the
// per-trunk default column; the global setting already lives in `settings`.

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable('trunks')
    .addColumn('record', 'integer', (c) => c.notNull().defaultTo(0))
    .execute();
}
