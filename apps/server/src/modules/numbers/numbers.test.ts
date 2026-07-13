// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PhoneNumber, Trunk } from '@switchboard/shared';
import { createTestApp, type TestApp } from '../../testing/harness';

let harness: TestApp;

beforeEach(async () => {
  harness = await createTestApp();
});

afterEach(async () => {
  await harness.close();
});

async function makeTrunk(
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const res = await harness.app.inject({
    method: 'POST',
    url: '/api/v1/trunks',
    payload: { name: `t-${Math.random()}`, target_host: 'host', ...overrides },
  });
  return res.json<Trunk>().id;
}

function createNumber(payload: Record<string, unknown>) {
  return harness.app.inject({
    method: 'POST',
    url: '/api/v1/numbers',
    payload,
  });
}

describe('numbers HTTP', () => {
  it('creates a number on an inbound-capable trunk', async () => {
    const trunkId = await makeTrunk();
    const res = await createNumber({ e164: '+14155550123', trunk_id: trunkId });
    expect(res.statusCode).toBe(201);
    expect(res.json<PhoneNumber>().id).toMatch(/^num_/);
  });

  it('rejects a non-E.164 number', async () => {
    const trunkId = await makeTrunk();
    const res = await createNumber({ e164: 'nope', trunk_id: trunkId });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an unknown trunk', async () => {
    const res = await createNumber({ e164: '+14155550123', trunk_id: 'ghost' });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: { code: string } }>().error.code).toBe(
      'bad_request',
    );
  });

  it('rejects an outbound-only trunk', async () => {
    const trunkId = await makeTrunk({
      direction: 'outbound',
      target_host: undefined,
    });
    const res = await createNumber({ e164: '+14155550123', trunk_id: trunkId });
    expect(res.statusCode).toBe(400);
  });

  it('lists, gets, updates, and deletes', async () => {
    const trunkId = await makeTrunk();
    const created = await createNumber({
      e164: '+14155550123',
      trunk_id: trunkId,
      label: 'main',
    });
    const id = created.json<PhoneNumber>().id;

    expect(
      (
        await harness.app.inject({ method: 'GET', url: '/api/v1/numbers' })
      ).json<PhoneNumber[]>(),
    ).toHaveLength(1);
    expect(
      (
        await harness.app.inject({
          method: 'GET',
          url: `/api/v1/numbers/${id}`,
        })
      ).statusCode,
    ).toBe(200);

    const patched = await harness.app.inject({
      method: 'PATCH',
      url: `/api/v1/numbers/${id}`,
      payload: { label: 'renamed' },
    });
    expect(patched.json<PhoneNumber>().label).toBe('renamed');

    const del = await harness.app.inject({
      method: 'DELETE',
      url: `/api/v1/numbers/${id}`,
    });
    expect(del.statusCode).toBe(204);
  });

  it('validates a trunk change on update and 404s unknown ids', async () => {
    const trunkA = await makeTrunk();
    const outbound = await makeTrunk({
      direction: 'outbound',
      target_host: undefined,
    });
    const created = await createNumber({
      e164: '+14155550100',
      trunk_id: trunkA,
    });
    const id = created.json<PhoneNumber>().id;

    const bad = await harness.app.inject({
      method: 'PATCH',
      url: `/api/v1/numbers/${id}`,
      payload: { trunk_id: outbound },
    });
    expect(bad.statusCode).toBe(400);

    // Re-sending the same trunk id skips re-validation and succeeds.
    const same = await harness.app.inject({
      method: 'PATCH',
      url: `/api/v1/numbers/${id}`,
      payload: { trunk_id: trunkA },
    });
    expect(same.statusCode).toBe(200);

    // Moving to a different, valid inbound trunk re-validates and succeeds.
    const trunkB = await makeTrunk();
    const moved = await harness.app.inject({
      method: 'PATCH',
      url: `/api/v1/numbers/${id}`,
      payload: { trunk_id: trunkB },
    });
    expect(moved.statusCode).toBe(200);
    expect(moved.json<PhoneNumber>().trunk_id).toBe(trunkB);

    expect(
      (await harness.app.inject({ method: 'GET', url: '/api/v1/numbers/nope' }))
        .statusCode,
    ).toBe(404);
    expect(
      (
        await harness.app.inject({
          method: 'PATCH',
          url: '/api/v1/numbers/nope',
          payload: { label: 'x' },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await harness.app.inject({
          method: 'DELETE',
          url: '/api/v1/numbers/nope',
        })
      ).statusCode,
    ).toBe(404);
  });
});
