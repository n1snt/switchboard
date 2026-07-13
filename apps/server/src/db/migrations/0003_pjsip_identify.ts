// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Kysely } from 'kysely';
import type { Database } from '../schema';

// Feature 16 needs an inbound INVITE arriving on a trunk to be matched to that
// trunk. Digest trunks match by username; an `ip`-auth trunk (data-model.md,
// a fixed-IP peer such as a self-hosted SIP app) matches by source address
// through a PJSIP `identify` object. The realtime mapping for these rows already
// exists (engine/config/sorcery.conf + extconfig.conf,
// res_pjsip_endpoint_identifier_ip => ps_endpoint_id_ips); this creates the
// table the trunk provisioner (feature 11) writes them into. Column names follow
// Asterisk's standard ps_endpoint_id_ips realtime schema.

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('ps_endpoint_id_ips')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('endpoint', 'text')
    .addColumn('match', 'text')
    .execute();
}
