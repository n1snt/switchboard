// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Call, Trunk } from '@switchboard/shared';
import { CALL_EXAMPLE } from '@switchboard/shared';
import { createTestApp, type TestApp } from '../../testing/harness';
import { CallRepo } from './calls.repo';

let harness: TestApp;
let repo: CallRepo;
let trunkId: string;

function callFixture(overrides: Partial<Call>): Call {
  return { ...CALL_EXAMPLE, ...overrides };
}

beforeEach(async () => {
  harness = await createTestApp();
  repo = new CallRepo(harness.db);
  // calls.trunk_id has a foreign key to trunks(id), so the outbound call
  // references a real trunk; the inbound one has no trunk (null).
  const created = await harness.app.inject({
    method: 'POST',
    url: '/api/v1/trunks',
    payload: { name: 't1', target_host: 'host' },
  });
  trunkId = created.json<Trunk>().id;
  await repo.upsert(
    callFixture({
      id: 'c-out',
      direction: 'outbound',
      state: 'ended',
      trunk_id: trunkId,
      started_at: '2026-07-13T10:00:00.000Z',
    }),
  );
  await repo.upsert(
    callFixture({
      id: 'c-in',
      direction: 'inbound',
      state: 'ringing',
      trunk_id: null,
      started_at: '2026-07-13T11:00:00.000Z',
    }),
  );
});

afterEach(async () => {
  await harness.close();
});

function list(query = ''): Promise<Call[]> {
  return harness.app
    .inject({ method: 'GET', url: `/api/v1/calls${query}` })
    .then((res) => res.json<Call[]>());
}

describe('calls HTTP', () => {
  it('lists all calls newest first', async () => {
    const calls = await list();
    expect(calls.map((c) => c.id)).toEqual(['c-in', 'c-out']);
  });

  it('maps received to outbound and placed to inbound', async () => {
    expect((await list('?direction=received')).map((c) => c.id)).toEqual([
      'c-out',
    ]);
    expect((await list('?direction=placed')).map((c) => c.id)).toEqual([
      'c-in',
    ]);
  });

  it('filters by trunk, state, and time range together', async () => {
    const calls = await list(
      `?trunk_id=${trunkId}&state=ended&from=2026-07-13T09:00:00.000Z&to=2026-07-13T10:30:00.000Z`,
    );
    expect(calls.map((c) => c.id)).toEqual(['c-out']);
  });

  it('gets a call with its (empty) SIP trace and 404s an unknown id', async () => {
    const res = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/calls/c-out',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ sip_trace: unknown[] }>().sip_trace).toEqual([]);
    expect(
      (await harness.app.inject({ method: 'GET', url: '/api/v1/calls/nope' }))
        .statusCode,
    ).toBe(404);
  });

  it('includes the recorded SIP trace in the detail', async () => {
    harness.services.traceStore.record('c-out', [
      {
        at: '2026-07-13T10:00:01.000Z',
        direction: 'incoming',
        method: 'INVITE',
        summary: 'INVITE',
      },
    ]);
    const res = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/calls/c-out',
    });
    expect(
      res.json<{ sip_trace: { method: string }[] }>().sip_trace[0]?.method,
    ).toBe('INVITE');
  });

  it('upsert replaces an existing row', async () => {
    await repo.upsert(
      callFixture({
        id: 'c-out',
        direction: 'outbound',
        state: 'answered',
        trunk_id: trunkId,
      }),
    );
    const again = await repo.get('c-out');
    expect(again?.state).toBe('answered');
    expect(await list()).toHaveLength(2);
  });
});
