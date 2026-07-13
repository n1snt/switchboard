// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { NUMBER_EXAMPLE } from '@switchboard/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    apiClient: {
      numbers: {
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
  numberKeys,
  useCreateNumber,
  useDeleteNumber,
  useNumber,
  useNumbers,
  useUpdateNumber,
} from './hooks';

type Mock = ReturnType<typeof vi.fn>;
const client = apiClient as unknown as {
  numbers: { list: Mock; get: Mock; create: Mock; update: Mock; remove: Mock };
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

const err = (message: string) => ({
  status: 400,
  body: { error: { code: 'x', message } },
});

describe('numberKeys', () => {
  it('builds keys', () => {
    expect(numberKeys.all).toEqual(['numbers']);
    expect(numberKeys.detail('n1')).toEqual(['numbers', 'n1']);
  });
});

describe('numbers hooks success paths', () => {
  it('lists, gets, creates, updates and deletes', async () => {
    client.numbers.list.mockResolvedValue({
      status: 200,
      body: [NUMBER_EXAMPLE],
    });
    client.numbers.get.mockResolvedValue({ status: 200, body: NUMBER_EXAMPLE });
    client.numbers.create.mockResolvedValue({
      status: 201,
      body: NUMBER_EXAMPLE,
    });
    client.numbers.update.mockResolvedValue({
      status: 200,
      body: NUMBER_EXAMPLE,
    });
    client.numbers.remove.mockResolvedValue({ status: 204, body: undefined });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const list = renderHook(() => useNumbers(), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    expect(list.result.current.data).toEqual([NUMBER_EXAMPLE]);

    const detail = renderHook(() => useNumber('n1'), { wrapper });
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    expect(client.numbers.get).toHaveBeenCalledWith({ params: { id: 'n1' } });

    const create = renderHook(() => useCreateNumber(), { wrapper });
    create.result.current.mutate({ e164: '+14155550123', trunk_id: 't1' });
    await waitFor(() => expect(create.result.current.isSuccess).toBe(true));

    const update = renderHook(() => useUpdateNumber('n1'), { wrapper });
    update.result.current.mutate({ label: 'Main' });
    await waitFor(() => expect(update.result.current.isSuccess).toBe(true));
    expect(client.numbers.update).toHaveBeenCalledWith({
      params: { id: 'n1' },
      body: { label: 'Main' },
    });

    const remove = renderHook(() => useDeleteNumber(), { wrapper });
    remove.result.current.mutate('n1');
    await waitFor(() => expect(remove.result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: numberKeys.all });
  });
});

describe('numbers hooks error paths', () => {
  it('surface server error messages', async () => {
    client.numbers.list.mockResolvedValue(err('list bad'));
    client.numbers.get.mockResolvedValue(err('get bad'));
    client.numbers.create.mockResolvedValue(err('create bad'));
    client.numbers.update.mockResolvedValue(err('update bad'));
    client.numbers.remove.mockResolvedValue(err('remove bad'));

    const list = renderHook(() => useNumbers(), { wrapper });
    await waitFor(() => expect(list.result.current.isError).toBe(true));
    expect(list.result.current.error?.message).toBe('list bad');

    const detail = renderHook(() => useNumber('n1'), { wrapper });
    await waitFor(() => expect(detail.result.current.isError).toBe(true));
    expect(detail.result.current.error?.message).toBe('get bad');

    const create = renderHook(() => useCreateNumber(), { wrapper });
    create.result.current.mutate({ e164: '+1', trunk_id: 't' });
    await waitFor(() => expect(create.result.current.isError).toBe(true));
    expect(create.result.current.error?.message).toBe('create bad');

    const update = renderHook(() => useUpdateNumber('n1'), { wrapper });
    update.result.current.mutate({ label: 'x' });
    await waitFor(() => expect(update.result.current.isError).toBe(true));
    expect(update.result.current.error?.message).toBe('update bad');

    const remove = renderHook(() => useDeleteNumber(), { wrapper });
    remove.result.current.mutate('n1');
    await waitFor(() => expect(remove.result.current.isError).toBe(true));
    expect(remove.result.current.error?.message).toBe('remove bad');
  });
});
