// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { SETTINGS_EXAMPLE } from '@switchboard/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    apiClient: {
      settings: { get: vi.fn(), update: vi.fn() },
    },
  };
});

import { apiClient } from '@/lib/api';
import { settingsKeys, useSettings, useUpdateSettings } from './hooks';

type Mock = ReturnType<typeof vi.fn>;
const client = apiClient as unknown as {
  settings: { get: Mock; update: Mock };
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

describe('settingsKeys', () => {
  it('has a stable key', () => {
    expect(settingsKeys.all).toEqual(['settings']);
  });
});

describe('useSettings', () => {
  it('reads the settings', async () => {
    client.settings.get.mockResolvedValue({
      status: 200,
      body: SETTINGS_EXAMPLE,
    });
    const { result } = renderHook(() => useSettings(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(SETTINGS_EXAMPLE);
  });

  it('surfaces an error', async () => {
    client.settings.get.mockResolvedValue({
      status: 500,
      body: { error: { code: 'x', message: 'read failed' } },
    });
    const { result } = renderHook(() => useSettings(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('read failed');
  });
});

describe('useUpdateSettings', () => {
  it('updates and invalidates', async () => {
    client.settings.update.mockResolvedValue({
      status: 200,
      body: { record_all_calls: true },
    });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateSettings(), { wrapper });
    result.current.mutate({ record_all_calls: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.settings.update).toHaveBeenCalledWith({
      body: { record_all_calls: true },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: settingsKeys.all });
  });

  it('rejects with the server error', async () => {
    client.settings.update.mockResolvedValue({
      status: 400,
      body: { error: { code: 'x', message: 'write failed' } },
    });
    const { result } = renderHook(() => useUpdateSettings(), { wrapper });
    result.current.mutate({ record_all_calls: false });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('write failed');
  });
});
