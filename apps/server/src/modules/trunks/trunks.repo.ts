// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { CodecSchema, DialRewriteSchema } from '@switchboard/shared';
import type {
  AuthMode,
  DtmfMode,
  MediaEncryption,
  Transport,
  Trunk,
  TrunkDirection,
  TrunkSource,
} from '@switchboard/shared';
import type { Db } from '../../db';
import type { TrunksTable } from '../../db/schema';
import {
  fromDbBool,
  fromJsonColumn,
  toDbBool,
  toJsonColumn,
} from '../../db/mappers';

// The only code that queries the `trunks` table. Maps the JSON and boolean
// columns at the edge (see db/mappers.ts) so callers work in domain types.

const AllowedIpsSchema = z.array(z.string());
const CodecsSchema = z.array(CodecSchema);

// The enum columns are stored as text and only ever written by the validated
// service, so reading them back as the domain union is safe (the DB is an
// internal boundary; the external boundaries are validated with Zod).
function rowToTrunk(row: TrunksTable): Trunk {
  return {
    id: row.id,
    name: row.name,
    direction: row.direction as TrunkDirection,
    enabled: fromDbBool(row.enabled),
    auth_mode: row.auth_mode as AuthMode,
    username: row.username ?? undefined,
    password: row.password ?? undefined,
    auth_username: row.auth_username ?? undefined,
    realm: row.realm ?? undefined,
    allowed_ips: fromJsonColumn(row.allowed_ips, AllowedIpsSchema),
    register: fromDbBool(row.register),
    registrar: row.registrar ?? undefined,
    register_expiry: row.register_expiry ?? undefined,
    transport: row.transport as Transport,
    target_host: row.target_host ?? undefined,
    target_port: row.target_port,
    outbound_proxy: row.outbound_proxy ?? undefined,
    dial_rewrite: fromJsonColumn(row.dial_rewrite, DialRewriteSchema),
    caller_id_name: row.caller_id_name ?? undefined,
    caller_id_number: row.caller_id_number ?? undefined,
    codecs: fromJsonColumn(row.codecs, CodecsSchema),
    dtmf_mode: row.dtmf_mode as DtmfMode,
    media_encryption: row.media_encryption as MediaEncryption,
    max_cps: row.max_cps,
    max_channels: row.max_channels,
    source: row.source as TrunkSource,
    created_at: row.created_at,
  };
}

function trunkToRow(trunk: Trunk): TrunksTable {
  return {
    id: trunk.id,
    name: trunk.name,
    direction: trunk.direction,
    enabled: toDbBool(trunk.enabled),
    auth_mode: trunk.auth_mode,
    username: trunk.username ?? null,
    password: trunk.password ?? null,
    auth_username: trunk.auth_username ?? null,
    realm: trunk.realm ?? null,
    allowed_ips: toJsonColumn(trunk.allowed_ips),
    register: toDbBool(trunk.register),
    registrar: trunk.registrar ?? null,
    register_expiry: trunk.register_expiry ?? null,
    transport: trunk.transport,
    target_host: trunk.target_host ?? null,
    target_port: trunk.target_port,
    outbound_proxy: trunk.outbound_proxy ?? null,
    dial_rewrite: toJsonColumn(trunk.dial_rewrite),
    caller_id_name: trunk.caller_id_name ?? null,
    caller_id_number: trunk.caller_id_number ?? null,
    codecs: toJsonColumn(trunk.codecs),
    dtmf_mode: trunk.dtmf_mode,
    media_encryption: trunk.media_encryption,
    max_cps: trunk.max_cps,
    max_channels: trunk.max_channels,
    source: trunk.source,
    created_at: trunk.created_at,
  };
}

export class TrunkRepo {
  constructor(private readonly db: Db) {}

  async list(): Promise<Trunk[]> {
    const rows = await this.db
      .selectFrom('trunks')
      .selectAll()
      .orderBy('created_at')
      .execute();
    return rows.map(rowToTrunk);
  }

  async get(id: string): Promise<Trunk | undefined> {
    const row = await this.db
      .selectFrom('trunks')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? rowToTrunk(row) : undefined;
  }

  async findByName(name: string): Promise<Trunk | undefined> {
    const row = await this.db
      .selectFrom('trunks')
      .selectAll()
      .where('name', '=', name)
      .executeTakeFirst();
    return row ? rowToTrunk(row) : undefined;
  }

  async insert(trunk: Trunk): Promise<void> {
    await this.db.insertInto('trunks').values(trunkToRow(trunk)).execute();
  }

  async replace(trunk: Trunk): Promise<void> {
    const { id, ...rest } = trunkToRow(trunk);
    await this.db
      .updateTable('trunks')
      .set(rest)
      .where('id', '=', id)
      .execute();
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('trunks')
      .where('id', '=', id)
      .executeTakeFirst();
    return result.numDeletedRows > 0n;
  }
}
