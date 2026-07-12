// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { createDb, type Db } from './index';
import { migrate } from './migrate';
import { fromDbBool, fromJsonColumn, toDbBool, toJsonColumn } from './mappers';

describe('boolean mapping', () => {
  it('maps domain booleans to integers and back', () => {
    expect(toDbBool(true)).toBe(1);
    expect(toDbBool(false)).toBe(0);
    expect(fromDbBool(1)).toBe(true);
    expect(fromDbBool(0)).toBe(false);
  });
});

describe('json mapping', () => {
  const schema = z.array(z.string());

  it('round-trips a JSON column value through its schema', () => {
    const text = toJsonColumn(['ulaw', 'alaw']);
    expect(fromJsonColumn(text, schema)).toEqual(['ulaw', 'alaw']);
  });

  it('rejects a column whose contents do not match the schema', () => {
    expect(() => fromJsonColumn('123', schema)).toThrow();
  });
});

describe('database round-trip', () => {
  let dir: string;
  let db: Db;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'switchboard-db-'));
    db = createDb(join(dir, 'test.sqlite'));
    await migrate(db);
  });

  afterEach(async () => {
    await db.destroy();
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes and reads a trunk row with mapped JSON and boolean columns', async () => {
    await db
      .insertInto('trunks')
      .values({
        id: 'trunk_1',
        name: 'agent-dev',
        direction: 'both',
        enabled: toDbBool(true),
        auth_mode: 'none',
        allowed_ips: toJsonColumn(['10.0.0.5']),
        register: toDbBool(false),
        transport: 'udp',
        target_host: 'host.docker.internal',
        target_port: 5060,
        dial_rewrite: toJsonColumn({ rules: [] }),
        codecs: toJsonColumn(['ulaw', 'alaw']),
        dtmf_mode: 'rfc2833',
        media_encryption: 'none',
        source: 'ui',
        created_at: '2026-07-13T10:02:00.000Z',
      })
      .execute();

    const row = await db
      .selectFrom('trunks')
      .selectAll()
      .where('id', '=', 'trunk_1')
      .executeTakeFirstOrThrow();

    expect(fromDbBool(row.enabled)).toBe(true);
    expect(fromJsonColumn(row.codecs, z.array(z.string()))).toEqual(['ulaw', 'alaw']);
    expect(fromJsonColumn(row.allowed_ips, z.array(z.string()))).toEqual(['10.0.0.5']);
  });
});
