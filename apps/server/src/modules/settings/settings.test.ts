// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Settings } from '@switchboard/shared';
import { createTestApp, type TestApp } from '../../testing/harness';

let harness: TestApp;

beforeEach(async () => {
  harness = await createTestApp();
});

afterEach(async () => {
  await harness.close();
});

function getSettings(): Promise<Settings> {
  return harness.app
    .inject({ method: 'GET', url: '/api/v1/settings' })
    .then((res) => res.json<Settings>());
}

describe('settings HTTP', () => {
  it('defaults record_all_calls to false with no stored rows', async () => {
    expect((await getSettings()).record_all_calls).toBe(false);
  });

  it('persists an update and leaves an empty patch unchanged', async () => {
    const patched = await harness.app.inject({
      method: 'PATCH',
      url: '/api/v1/settings',
      payload: { record_all_calls: true },
    });
    expect(patched.json<Settings>().record_all_calls).toBe(true);
    expect((await getSettings()).record_all_calls).toBe(true);

    const noop = await harness.app.inject({
      method: 'PATCH',
      url: '/api/v1/settings',
      payload: {},
    });
    expect(noop.json<Settings>().record_all_calls).toBe(true);
  });
});

describe('settings environment seeding', () => {
  it('overrides on boot only when a value is supplied', async () => {
    await harness.services.settings.update({ record_all_calls: true });
    await harness.services.settings.seedRecordAll(undefined);
    expect((await getSettings()).record_all_calls).toBe(true);

    await harness.services.settings.seedRecordAll(false);
    expect((await getSettings()).record_all_calls).toBe(false);
  });
});
