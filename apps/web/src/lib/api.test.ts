// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Health } from '@switchboard/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchHealth, healthQueryKey } from './api';

const validHealth: Health = {
  status: 'ok',
  engine: 'connected',
  version: '0.0.0',
};

function mockFetch(
  response: Partial<Response> & { json?: () => Promise<unknown> },
): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(validHealth),
      ...response,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('healthQueryKey', () => {
  it('is a stable key', () => {
    expect(healthQueryKey).toEqual(['health']);
  });
});

describe('fetchHealth', () => {
  it('returns the parsed health body on success (no signal)', async () => {
    mockFetch({ json: () => Promise.resolve(validHealth) });
    await expect(fetchHealth()).resolves.toEqual(validHealth);
    expect(fetch).toHaveBeenCalledWith('/api/v1/health', {});
  });

  it('passes an abort signal through to fetch when given', async () => {
    mockFetch({ json: () => Promise.resolve(validHealth) });
    const controller = new AbortController();
    await fetchHealth(controller.signal);
    expect(fetch).toHaveBeenCalledWith('/api/v1/health', {
      signal: controller.signal,
    });
  });

  it('throws on a non-2xx response', async () => {
    mockFetch({ ok: false, status: 503 });
    await expect(fetchHealth()).rejects.toThrow('Health request failed: 503');
  });

  it('throws when the body does not match the schema', async () => {
    mockFetch({ json: () => Promise.resolve({ status: 'nope' }) });
    await expect(fetchHealth()).rejects.toThrow();
  });
});
