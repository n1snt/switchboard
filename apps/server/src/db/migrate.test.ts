// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDb, type Db } from './index';
import { migrate } from './migrate';

let dir: string;
let db: Db;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'switchboard-db-'));
  db = createDb(join(dir, 'test.sqlite'));
});

afterEach(async () => {
  await db.destroy();
  rmSync(dir, { recursive: true, force: true });
});

describe('migrate', () => {
  it('creates the full schema on a fresh database', async () => {
    const ran = await migrate(db);
    expect(ran).toEqual([
      '0001_init',
      '0002_pjsip_realtime',
      '0003_pjsip_identify',
    ]);

    const tables = await db.introspection.getTables();
    const names = tables.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'trunks',
        'numbers',
        'routes',
        'calls',
        'settings',
        'ps_endpoints',
        'ps_auths',
        'ps_aors',
        'ps_endpoint_id_ips',
      ]),
    );
  });

  it('creates the trunk provider-parity columns', async () => {
    await migrate(db);
    const tables = await db.introspection.getTables();
    const trunks = tables.find((t) => t.name === 'trunks');
    const cols = (trunks?.columns ?? []).map((c) => c.name);
    expect(cols).toEqual(
      expect.arrayContaining([
        'auth_mode',
        'codecs',
        'dtmf_mode',
        'media_encryption',
        'dial_rewrite',
        'source',
        'created_at',
      ]),
    );
  });

  it('is idempotent: re-running applies nothing', async () => {
    await migrate(db);
    const second = await migrate(db);
    expect(second).toEqual([]);
  });
});
