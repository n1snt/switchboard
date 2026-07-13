// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Call, Trunk } from '@switchboard/shared';
import { CALL_EXAMPLE } from '@switchboard/shared';
import { createTestApp, type TestApp } from '../../testing/harness';
import { CallRepo } from '../calls/calls.repo';
import { resolveRecordEnabled, resolveWithin } from './recording';

describe('resolveWithin', () => {
  it('resolves a name inside the directory', () => {
    expect(resolveWithin('/rec', 'take.wav')).toBe('/rec/take.wav');
  });

  it('rejects a name that escapes the directory', () => {
    expect(resolveWithin('/rec', '../secret')).toBeNull();
  });
});

describe('resolveRecordEnabled (most specific wins)', () => {
  it.each([
    [true, undefined, false, true],
    [false, true, true, false],
    [undefined, true, false, true],
    [undefined, false, true, false],
    [undefined, undefined, true, true],
    [undefined, undefined, false, false],
  ])(
    'perCall=%s perTrunk=%s global=%s -> %s',
    (perCall, perTrunk, global, expected) => {
      expect(resolveRecordEnabled(perCall, perTrunk, global)).toBe(expected);
    },
  );
});

describe('recording download endpoint', () => {
  let harness: TestApp;
  let repo: CallRepo;
  let trunkId: string;

  async function storeCall(recording: string | null): Promise<string> {
    const created = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/trunks',
      payload: { name: `t-${recording ?? 'none'}`, target_host: 'h' },
    });
    trunkId = created.json<Trunk>().id;
    const call: Call = {
      ...CALL_EXAMPLE,
      id: `call-${recording ?? 'none'}`,
      trunk_id: trunkId,
      recording,
    };
    await repo.upsert(call);
    return call.id;
  }

  beforeEach(async () => {
    harness = await createTestApp();
    repo = new CallRepo(harness.db);
  });

  afterEach(async () => {
    await harness.close();
  });

  it('streams the recording file', async () => {
    writeFileSync(join(harness.recordingsDir, 'take.wav'), 'RIFFfake');
    const id = await storeCall('take.wav');
    const res = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/calls/${id}/recording`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('audio/wav');
    expect(res.body).toContain('RIFF');
  });

  it('404s a call with no recording', async () => {
    const id = await storeCall(null);
    expect(
      (
        await harness.app.inject({
          method: 'GET',
          url: `/api/v1/calls/${id}/recording`,
        })
      ).statusCode,
    ).toBe(404);
  });

  it('404s an unknown call', async () => {
    expect(
      (
        await harness.app.inject({
          method: 'GET',
          url: '/api/v1/calls/nope/recording',
        })
      ).statusCode,
    ).toBe(404);
  });

  it('404s when the file is missing on disk', async () => {
    const id = await storeCall('missing.wav');
    expect(
      (
        await harness.app.inject({
          method: 'GET',
          url: `/api/v1/calls/${id}/recording`,
        })
      ).statusCode,
    ).toBe(404);
  });

  it('refuses a path that escapes the recordings directory', async () => {
    const id = await storeCall('../../etc/passwd');
    expect(
      (
        await harness.app.inject({
          method: 'GET',
          url: `/api/v1/calls/${id}/recording`,
        })
      ).statusCode,
    ).toBe(404);
  });
});
