// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Kysely } from 'kysely';
import type { Database } from '../schema';

// The initial schema: trunks, numbers, routes, calls, and settings, matching
// data-model.md. fault_profiles and the PJSIP realtime tables land in their own
// features (26 and 11).

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('trunks')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('direction', 'text', (c) => c.notNull())
    .addColumn('enabled', 'integer', (c) => c.notNull().defaultTo(1))
    .addColumn('auth_mode', 'text', (c) => c.notNull())
    .addColumn('username', 'text')
    .addColumn('password', 'text')
    .addColumn('auth_username', 'text')
    .addColumn('realm', 'text')
    .addColumn('allowed_ips', 'text', (c) => c.notNull().defaultTo('[]'))
    .addColumn('register', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('registrar', 'text')
    .addColumn('register_expiry', 'integer')
    .addColumn('transport', 'text', (c) => c.notNull())
    .addColumn('target_host', 'text')
    .addColumn('target_port', 'integer', (c) => c.notNull().defaultTo(5060))
    .addColumn('outbound_proxy', 'text')
    .addColumn('dial_rewrite', 'text', (c) =>
      c.notNull().defaultTo('{"rules":[]}'),
    )
    .addColumn('caller_id_name', 'text')
    .addColumn('caller_id_number', 'text')
    .addColumn('codecs', 'text', (c) =>
      c.notNull().defaultTo('["ulaw","alaw"]'),
    )
    .addColumn('dtmf_mode', 'text', (c) => c.notNull())
    .addColumn('media_encryption', 'text', (c) => c.notNull())
    .addColumn('max_cps', 'integer')
    .addColumn('max_channels', 'integer')
    .addColumn('source', 'text', (c) => c.notNull())
    .addColumn('created_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('numbers')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('e164', 'text', (c) => c.notNull().unique())
    .addColumn('trunk_id', 'text', (c) =>
      c.notNull().references('trunks.id').onDelete('cascade'),
    )
    .addColumn('label', 'text')
    .execute();

  await db.schema
    .createTable('routes')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('direction', 'text', (c) => c.notNull())
    .addColumn('match', 'text', (c) => c.notNull())
    .addColumn('destination', 'text', (c) => c.notNull())
    .addColumn('priority', 'integer', (c) => c.notNull().defaultTo(100))
    .execute();

  await db.schema
    .createTable('calls')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('direction', 'text', (c) => c.notNull())
    .addColumn('from_number', 'text', (c) => c.notNull())
    .addColumn('to_number', 'text', (c) => c.notNull())
    .addColumn('trunk_id', 'text', (c) =>
      c.references('trunks.id').onDelete('set null'),
    )
    .addColumn('state', 'text', (c) => c.notNull())
    .addColumn('started_at', 'text', (c) => c.notNull())
    .addColumn('answered_at', 'text')
    .addColumn('ended_at', 'text')
    .addColumn('hangup_cause', 'text')
    .addColumn('codec', 'text')
    .addColumn('recording', 'text')
    .execute();

  await db.schema
    .createTable('settings')
    .addColumn('key', 'text', (c) => c.primaryKey())
    .addColumn('value', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();
}
