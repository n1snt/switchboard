// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';
import type { Trunk } from '@switchboard/shared';
import { createTestApp, type TestApp } from '../../testing/harness';
import type { TrunkProvisioner } from './provisioner';

let harness: TestApp;
let provisioner: TrunkProvisioner & { apply: Mock; remove: Mock };

beforeEach(async () => {
  provisioner = {
    apply: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  harness = await createTestApp({ provisioner });
});

afterEach(async () => {
  await harness.close();
});

const quickAdd = { name: 'agent-dev', target_host: 'host.docker.internal' };

function create(payload: Record<string, unknown>) {
  return harness.app.inject({ method: 'POST', url: '/api/v1/trunks', payload });
}

describe('trunks HTTP', () => {
  it('creates a trunk and provisions it', async () => {
    const res = await create(quickAdd);
    expect(res.statusCode).toBe(201);
    const trunk = res.json<Trunk>();
    expect(trunk.id).toMatch(/^trunk_/);
    expect(trunk.source).toBe('ui');
    expect(trunk.auth_mode).toBe('none');
    expect(trunk.record).toBe(false);
    expect(provisioner.apply).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'agent-dev' }),
    );
  });

  it('round-trips a trunk created with record enabled', async () => {
    const res = await create({ ...quickAdd, record: true });
    expect(res.statusCode).toBe(201);
    const trunk = res.json<Trunk>();
    expect(trunk.record).toBe(true);
    const fetched = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/trunks/${trunk.id}`,
    });
    expect(fetched.json<Trunk>().record).toBe(true);
  });

  it('rejects an invalid trunk with the error envelope', async () => {
    const res = await create({
      name: 'bad',
      direction: 'outbound',
      auth_mode: 'digest',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: { code: string } }>().error.code).toBe(
      'validation_error',
    );
  });

  it('rejects a trunk missing its name', async () => {
    expect((await create({ direction: 'outbound' })).statusCode).toBe(400);
  });

  it('lists trunks', async () => {
    await create(quickAdd);
    await create({ name: 'carrier', target_host: '10.0.0.5' });
    const res = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/trunks',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<Trunk[]>()).toHaveLength(2);
  });

  it('gets a trunk and 404s an unknown id', async () => {
    const created = await create(quickAdd);
    const id = created.json<Trunk>().id;
    expect(
      (await harness.app.inject({ method: 'GET', url: `/api/v1/trunks/${id}` }))
        .statusCode,
    ).toBe(200);
    const missing = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/trunks/nope',
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json<{ error: { code: string } }>().error.code).toBe(
      'not_found',
    );
  });

  it('updates a trunk and re-provisions', async () => {
    const created = await create(quickAdd);
    const id = created.json<Trunk>().id;
    provisioner.apply.mockClear();
    const res = await harness.app.inject({
      method: 'PATCH',
      url: `/api/v1/trunks/${id}`,
      payload: { name: 'renamed' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<Trunk>().name).toBe('renamed');
    expect(provisioner.apply).toHaveBeenCalledOnce();
  });

  it('404s an update to an unknown trunk', async () => {
    const res = await harness.app.inject({
      method: 'PATCH',
      url: '/api/v1/trunks/nope',
      payload: { name: 'x' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('deletes a trunk and deprovisions it', async () => {
    const created = await create(quickAdd);
    const id = created.json<Trunk>().id;
    const res = await harness.app.inject({
      method: 'DELETE',
      url: `/api/v1/trunks/${id}`,
    });
    expect(res.statusCode).toBe(204);
    expect(provisioner.remove).toHaveBeenCalledWith(id);
    expect(
      (await harness.app.inject({ method: 'GET', url: `/api/v1/trunks/${id}` }))
        .statusCode,
    ).toBe(404);
  });

  it('404s a delete of an unknown trunk', async () => {
    expect(
      (
        await harness.app.inject({
          method: 'DELETE',
          url: '/api/v1/trunks/nope',
        })
      ).statusCode,
    ).toBe(404);
  });
});

describe('trunk service upsertByName (environment provisioning)', () => {
  it('creates then updates the same trunk by name', async () => {
    const created = await harness.services.trunks.upsertByName(
      { ...defaultsFor('agent-dev', 'host-a') },
      'env',
    );
    expect(created.source).toBe('env');
    const updated = await harness.services.trunks.upsertByName(
      { ...defaultsFor('agent-dev', 'host-b') },
      'env',
    );
    expect(updated.id).toBe(created.id);
    expect(updated.target_host).toBe('host-b');
    expect(await harness.services.trunks.list()).toHaveLength(1);
  });
});

// A fully-defaulted trunk input, as the create schema would produce.
function defaultsFor(name: string, host: string) {
  return {
    name,
    direction: 'both' as const,
    enabled: true,
    auth_mode: 'none' as const,
    allowed_ips: [],
    register: false,
    transport: 'udp' as const,
    target_host: host,
    target_port: 5060,
    dial_rewrite: { rules: [] },
    codecs: ['ulaw' as const],
    dtmf_mode: 'rfc2833' as const,
    media_encryption: 'none' as const,
    record: false,
    max_cps: null,
    max_channels: null,
  };
}
