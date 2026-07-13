// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TRUNK_EXAMPLE } from '@switchboard/shared';
import type { Trunk } from '@switchboard/shared';
import { createDb, type Db } from '../../db';
import { migrate } from '../../db/migrate';
import { createRealtimeProvisioner } from './realtime-provisioner';
import type { TrunkProvisioner } from './provisioner';

let dir: string;
let db: Db;
let provisioner: TrunkProvisioner;

function trunk(overrides: Partial<Trunk>): Trunk {
  return { ...TRUNK_EXAMPLE, ...overrides };
}

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'sb-rt-'));
  db = createDb(join(dir, 'test.sqlite'));
  await migrate(db);
  provisioner = createRealtimeProvisioner(db);
});

afterEach(async () => {
  await db.destroy();
  rmSync(dir, { recursive: true, force: true });
});

const endpoints = (): Promise<
  {
    id: string;
    auth: string | null;
    outbound_auth: string | null;
    allow: string | null;
  }[]
> =>
  db
    .selectFrom('ps_endpoints')
    .select(['id', 'auth', 'outbound_auth', 'allow'])
    .execute();

describe('realtime provisioner', () => {
  it('writes an aor and endpoint for an auth-none trunk (no auth row)', async () => {
    await provisioner.apply(
      trunk({ id: 't1', auth_mode: 'none', username: undefined }),
    );
    const aor = await db
      .selectFrom('ps_aors')
      .selectAll()
      .where('id', '=', 't1')
      .executeTakeFirst();
    expect(aor?.contact).toBe('sip:host.docker.internal:5060');
    const eps = await endpoints();
    expect(eps[0]?.auth).toBeNull();
    expect(eps[0]?.allow).toBe('ulaw,alaw');
    expect(await db.selectFrom('ps_auths').selectAll().execute()).toHaveLength(
      0,
    );
  });

  it('writes an identify row for an ip-auth trunk and removes it on delete', async () => {
    await provisioner.apply(
      trunk({
        id: 't-ip',
        auth_mode: 'ip',
        allowed_ips: ['10.0.0.5', '10.0.0.6'],
      }),
    );
    const identify = await db
      .selectFrom('ps_endpoint_id_ips')
      .selectAll()
      .where('id', '=', 't-ip')
      .executeTakeFirst();
    expect(identify?.endpoint).toBe('t-ip');
    expect(identify?.match).toBe('10.0.0.5,10.0.0.6');

    await provisioner.remove('t-ip');
    expect(
      await db.selectFrom('ps_endpoint_id_ips').selectAll().execute(),
    ).toHaveLength(0);
  });

  it('writes no identify row for a non-ip trunk', async () => {
    await provisioner.apply(trunk({ id: 't-noip', auth_mode: 'none' }));
    expect(
      await db.selectFrom('ps_endpoint_id_ips').selectAll().execute(),
    ).toHaveLength(0);
  });

  it('writes an auth row for a digest trunk', async () => {
    await provisioner.apply(
      trunk({ id: 't2', auth_mode: 'digest', username: 'u', password: 'p' }),
    );
    const auth = await db
      .selectFrom('ps_auths')
      .selectAll()
      .where('id', '=', 't2')
      .executeTakeFirst();
    expect(auth?.username).toBe('u');
    expect((await endpoints())[0]?.auth).toBe('t2');
  });

  it('sets outbound_auth for a registering trunk', async () => {
    await provisioner.apply(
      trunk({
        id: 't3',
        auth_mode: 'digest',
        username: 'u',
        password: 'p',
        register: true,
        registrar: 'sip:reg',
      }),
    );
    expect((await endpoints())[0]?.outbound_auth).toBe('t3');
  });

  it('writes an auth row with a realm and no password', async () => {
    await provisioner.apply(
      trunk({ id: 't7', username: 'u', password: undefined, realm: 'r' }),
    );
    const auth = await db
      .selectFrom('ps_auths')
      .selectAll()
      .where('id', '=', 't7')
      .executeTakeFirst();
    expect(auth?.password).toBeNull();
    expect(auth?.realm).toBe('r');
  });

  it('leaves outbound_auth null when registering without credentials', async () => {
    await provisioner.apply(
      trunk({
        id: 't8',
        auth_mode: 'none',
        username: undefined,
        register: true,
        registrar: 'sip:reg',
      }),
    );
    expect((await endpoints())[0]?.outbound_auth).toBeNull();
  });

  it('leaves the aor contact null for an outbound-only trunk with no target host', async () => {
    await provisioner.apply(
      trunk({ id: 't4', direction: 'outbound', target_host: undefined }),
    );
    const aor = await db
      .selectFrom('ps_aors')
      .selectAll()
      .where('id', '=', 't4')
      .executeTakeFirst();
    expect(aor?.contact).toBeNull();
  });

  it('provisions nothing for a disabled trunk', async () => {
    await provisioner.apply(trunk({ id: 't5', enabled: false }));
    expect(await endpoints()).toHaveLength(0);
  });

  it('re-applies idempotently and removes on delete', async () => {
    await provisioner.apply(trunk({ id: 't6' }));
    await provisioner.apply(trunk({ id: 't6', codecs: ['opus'] }));
    const eps = await endpoints();
    expect(eps).toHaveLength(1);
    expect(eps[0]?.allow).toBe('opus');

    await provisioner.remove('t6');
    expect(await endpoints()).toHaveLength(0);
    expect(await db.selectFrom('ps_aors').selectAll().execute()).toHaveLength(
      0,
    );
  });
});
