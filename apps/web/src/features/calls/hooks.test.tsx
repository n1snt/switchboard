// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { CALL_EXAMPLE } from '@switchboard/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    apiClient: {
      calls: { list: vi.fn(), get: vi.fn() },
    },
  };
});

import { apiClient } from '@/lib/api';
import { callKeys, useCall, useCalls } from './hooks';

type Mock = ReturnType<typeof vi.fn>;
const client = apiClient as unknown as {
  calls: { list: Mock; get: Mock };
};

let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});
afterEach(() => {
  vi.clearAllMocks();
});

const detail = { ...CALL_EXAMPLE, sip_trace: [] };

describe('callKeys', () => {
  it('builds list and detail keys', () => {
    expect(callKeys.all).toEqual(['calls']);
    expect(callKeys.list({ direction: 'placed' })).toEqual([
      'calls',
      'list',
      { direction: 'placed' },
    ]);
    expect(callKeys.detail('c1')).toEqual(['calls', 'detail', 'c1']);
  });
});

describe('useCalls', () => {
  it('lists calls for a query', async () => {
    client.calls.list.mockResolvedValue({ status: 200, body: [CALL_EXAMPLE] });
    const { result } = renderHook(() => useCalls({ direction: 'placed' }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.calls.list).toHaveBeenCalledWith({
      query: { direction: 'placed' },
    });
    expect(result.current.data).toEqual([CALL_EXAMPLE]);
  });

  it('surfaces an error', async () => {
    client.calls.list.mockResolvedValue({
      status: 500,
      body: { error: { code: 'x', message: 'list failed' } },
    });
    const { result } = renderHook(() => useCalls({}), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('list failed');
  });
});

describe('useCall', () => {
  it('gets a call with its trace', async () => {
    client.calls.get.mockResolvedValue({ status: 200, body: detail });
    const { result } = renderHook(() => useCall('c1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.calls.get).toHaveBeenCalledWith({ params: { id: 'c1' } });
    expect(result.current.data).toEqual(detail);
  });

  it('surfaces a not-found error', async () => {
    client.calls.get.mockResolvedValue({
      status: 404,
      body: { error: { code: 'not_found', message: 'no call' } },
    });
    const { result } = renderHook(() => useCall('cx'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('no call');
  });
});
