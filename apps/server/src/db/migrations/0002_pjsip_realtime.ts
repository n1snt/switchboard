// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Kysely } from 'kysely';
import type { Database } from '../schema';

// Decision D1: dynamic trunks are provisioned as PJSIP Realtime objects. Asterisk
// reads these tables directly (res_config_sqlite3 + sorcery) from the shared
// SQLite file, so a trunk saved through the API becomes a live endpoint with no
// reload. Column names follow Asterisk's standard ps_* realtime schema; see
// documentation/dev/engine-provisioning.md. Booleans/enums are stored as the
// yes/no and named-value strings Asterisk expects.

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('ps_aors')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('contact', 'text')
    .addColumn('max_contacts', 'integer')
    .addColumn('qualify_frequency', 'integer')
    .execute();

  await db.schema
    .createTable('ps_auths')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('auth_type', 'text')
    .addColumn('username', 'text')
    .addColumn('password', 'text')
    .addColumn('realm', 'text')
    .execute();

  await db.schema
    .createTable('ps_endpoints')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('transport', 'text')
    .addColumn('aors', 'text')
    .addColumn('auth', 'text')
    .addColumn('outbound_auth', 'text')
    .addColumn('context', 'text')
    .addColumn('disallow', 'text')
    .addColumn('allow', 'text')
    .addColumn('direct_media', 'text')
    .addColumn('dtmf_mode', 'text')
    .execute();
}
