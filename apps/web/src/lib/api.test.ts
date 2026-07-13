// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { CALL_EXAMPLE, TRUNK_EXAMPLE, type Health } from '@switchboard/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  apiClient,
  apiErrorMessage,
  fetchHealth,
  healthQueryKey,
  recordingUrl,
  setCallRecording,
} from './api';

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

describe('apiErrorMessage', () => {
  it('extracts the message from the shared error envelope', () => {
    expect(apiErrorMessage({ error: { code: 'bad', message: 'Nope' } })).toBe(
      'Nope',
    );
  });

  it('falls back to a generic message for an unexpected body', () => {
    expect(apiErrorMessage({ oops: true })).toBe('Request failed');
  });
});

describe('recordingUrl', () => {
  it('builds the relative binary download URL for a call', () => {
    expect(recordingUrl('call_1')).toBe('/api/v1/calls/call_1/recording');
  });
});

describe('setCallRecording', () => {
  it('returns the updated call on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...CALL_EXAMPLE, recording: 'rec_1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await setCallRecording('call_1', true);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/calls/call_1/recording',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ enabled: true }),
      }),
    );
    expect(result).toEqual({ ...CALL_EXAMPLE, recording: 'rec_1' });
  });

  it('throws with the server message when the call is not live', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: 'conflict', message: 'Not live' } }),
          { status: 409, headers: { 'content-type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(setCallRecording('call_1', false)).rejects.toThrow('Not live');
  });
});

describe('apiClient', () => {
  it('issues relative requests and returns the typed body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([TRUNK_EXAMPLE]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiClient.trunks.list();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/trunks',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.status).toBe(200);
    expect(result.body).toEqual([TRUNK_EXAMPLE]);
  });
});
