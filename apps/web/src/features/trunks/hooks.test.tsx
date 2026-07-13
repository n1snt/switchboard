// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { TRUNK_EXAMPLE } from '@switchboard/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    apiClient: {
      trunks: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
      },
    },
  };
});

import { apiClient } from '@/lib/api';
import {
  trunkKeys,
  useCreateTrunk,
  useDeleteTrunk,
  useTrunk,
  useTrunks,
  useUpdateTrunk,
} from './hooks';

type Mock = ReturnType<typeof vi.fn>;
const client = apiClient as unknown as {
  trunks: {
    list: Mock;
    get: Mock;
    create: Mock;
    update: Mock;
    remove: Mock;
  };
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

describe('trunkKeys', () => {
  it('builds list and detail keys', () => {
    expect(trunkKeys.all).toEqual(['trunks']);
    expect(trunkKeys.detail('trunk_1')).toEqual(['trunks', 'trunk_1']);
  });
});

describe('useTrunks', () => {
  it('returns the list on success', async () => {
    client.trunks.list.mockResolvedValue({
      status: 200,
      body: [TRUNK_EXAMPLE],
    });
    const { result } = renderHook(() => useTrunks(), { wrapper });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual([TRUNK_EXAMPLE]);
  });

  it('throws the server error message on failure', async () => {
    client.trunks.list.mockResolvedValue({
      status: 500,
      body: { error: { code: 'boom', message: 'Boom' } },
    });
    const { result } = renderHook(() => useTrunks(), { wrapper });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('Boom');
  });
});

describe('useTrunk', () => {
  it('fetches a single trunk', async () => {
    client.trunks.get.mockResolvedValue({ status: 200, body: TRUNK_EXAMPLE });
    const { result } = renderHook(() => useTrunk('trunk_1'), { wrapper });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.trunks.get).toHaveBeenCalledWith({
      params: { id: 'trunk_1' },
    });
    expect(result.current.data).toEqual(TRUNK_EXAMPLE);
  });

  it('surfaces a not-found error', async () => {
    client.trunks.get.mockResolvedValue({
      status: 404,
      body: { error: { code: 'not_found', message: 'Missing' } },
    });
    const { result } = renderHook(() => useTrunk('trunk_x'), { wrapper });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('Missing');
  });
});

describe('useCreateTrunk', () => {
  it('creates and invalidates the trunk cache', async () => {
    client.trunks.create.mockResolvedValue({
      status: 201,
      body: TRUNK_EXAMPLE,
    });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateTrunk(), { wrapper });

    result.current.mutate({ name: 'x', target_host: 'h' });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.trunks.create).toHaveBeenCalledWith({
      body: { name: 'x', target_host: 'h' },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: trunkKeys.all });
  });

  it('rejects with the server error message', async () => {
    client.trunks.create.mockResolvedValue({
      status: 400,
      body: { error: { code: 'invalid', message: 'Bad trunk' } },
    });
    const { result } = renderHook(() => useCreateTrunk(), { wrapper });
    result.current.mutate({ name: '' });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('Bad trunk');
  });
});

describe('useUpdateTrunk', () => {
  it('updates and invalidates', async () => {
    client.trunks.update.mockResolvedValue({
      status: 200,
      body: TRUNK_EXAMPLE,
    });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateTrunk('trunk_1'), { wrapper });

    result.current.mutate({ name: 'renamed' });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.trunks.update).toHaveBeenCalledWith({
      params: { id: 'trunk_1' },
      body: { name: 'renamed' },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: trunkKeys.all });
  });

  it('rejects on error', async () => {
    client.trunks.update.mockResolvedValue({
      status: 404,
      body: { error: { code: 'not_found', message: 'Gone' } },
    });
    const { result } = renderHook(() => useUpdateTrunk('trunk_x'), { wrapper });
    result.current.mutate({ name: 'x' });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('Gone');
  });
});

describe('useDeleteTrunk', () => {
  it('deletes and invalidates', async () => {
    client.trunks.remove.mockResolvedValue({ status: 204, body: undefined });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteTrunk(), { wrapper });

    result.current.mutate('trunk_1');
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.trunks.remove).toHaveBeenCalledWith({
      params: { id: 'trunk_1' },
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: trunkKeys.all });
  });

  it('rejects on error', async () => {
    client.trunks.remove.mockResolvedValue({
      status: 404,
      body: { error: { code: 'not_found', message: 'Nope' } },
    });
    const { result } = renderHook(() => useDeleteTrunk(), { wrapper });
    result.current.mutate('trunk_x');
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('Nope');
  });
});
