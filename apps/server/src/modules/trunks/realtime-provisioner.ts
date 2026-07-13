// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Trunk } from '@switchboard/shared';
import type { Db } from '../../db';
import type { TrunkProvisioner } from './provisioner';

// Feature 11: map a trunk to Asterisk PJSIP realtime rows (Decision D1). Writing
// these rows into the shared SQLite file makes the trunk a live endpoint without
// an Asterisk reload. The endpoint's dialplan context routes trunk calls into the
// Stasis application (features 16/17); see documentation/dev/engine-provisioning.md.

const TRUNK_CONTEXT = 'switchboard-trunk';

async function removeRows(db: Db, id: string): Promise<void> {
  await db.deleteFrom('ps_endpoints').where('id', '=', id).execute();
  await db.deleteFrom('ps_auths').where('id', '=', id).execute();
  await db.deleteFrom('ps_aors').where('id', '=', id).execute();
  await db.deleteFrom('ps_endpoint_id_ips').where('id', '=', id).execute();
}

/** A provisioner that writes PJSIP realtime rows for each trunk. */
export function createRealtimeProvisioner(db: Db): TrunkProvisioner {
  return {
    async apply(trunk: Trunk): Promise<void> {
      // Idempotent: clear any prior rows, then (re)create for an enabled trunk.
      await removeRows(db, trunk.id);
      if (!trunk.enabled) {
        return;
      }

      const hasCreds = trunk.username !== undefined;

      await db
        .insertInto('ps_aors')
        .values({
          id: trunk.id,
          contact: trunk.target_host
            ? `sip:${trunk.target_host}:${trunk.target_port}`
            : null,
          max_contacts: 1,
          qualify_frequency: 0,
        })
        .execute();

      if (trunk.username !== undefined) {
        await db
          .insertInto('ps_auths')
          .values({
            id: trunk.id,
            auth_type: 'userpass',
            username: trunk.username,
            password: trunk.password ?? null,
            realm: trunk.realm ?? null,
          })
          .execute();
      }

      await db
        .insertInto('ps_endpoints')
        .values({
          id: trunk.id,
          transport: `transport-${trunk.transport}`,
          aors: trunk.id,
          auth: hasCreds ? trunk.id : null,
          outbound_auth: trunk.register && hasCreds ? trunk.id : null,
          context: TRUNK_CONTEXT,
          disallow: 'all',
          allow: trunk.codecs.join(','),
          direct_media: 'no',
          dtmf_mode: trunk.dtmf_mode,
        })
        .execute();

      // Source-IP identification (feature 16): let Asterisk match an inbound
      // INVITE from a known peer to this trunk by its source address. Only
      // `ip`-auth trunks with at least one allowed address get an identify row;
      // digest trunks are matched by username and need none.
      if (trunk.auth_mode === 'ip' && trunk.allowed_ips.length > 0) {
        await db
          .insertInto('ps_endpoint_id_ips')
          .values({
            id: trunk.id,
            endpoint: trunk.id,
            match: trunk.allowed_ips.join(','),
          })
          .execute();
      }
    },

    async remove(trunkId: string): Promise<void> {
      await removeRows(db, trunkId);
    },
  };
}
