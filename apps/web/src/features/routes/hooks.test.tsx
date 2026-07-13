// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { ROUTE_EXAMPLE } from '@switchboard/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    apiClient: {
      routes: {
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
  routeKeys,
  useCreateRoute,
  useDeleteRoute,
  useRoute,
  useRoutes,
  useUpdateRoute,
} from './hooks';

type Mock = ReturnType<typeof vi.fn>;
const client = apiClient as unknown as {
  routes: { list: Mock; get: Mock; create: Mock; update: Mock; remove: Mock };
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

describe('routeKeys', () => {
  it('builds keys', () => {
    expect(routeKeys.all).toEqual(['routes']);
    expect(routeKeys.detail('r1')).toEqual(['routes', 'r1']);
  });
});

describe('routes hooks success paths', () => {
  it('lists, gets, creates, updates and deletes', async () => {
    client.routes.list.mockResolvedValue({
      status: 200,
      body: [ROUTE_EXAMPLE],
    });
    client.routes.get.mockResolvedValue({ status: 200, body: ROUTE_EXAMPLE });
    client.routes.create.mockResolvedValue({
      status: 201,
      body: ROUTE_EXAMPLE,
    });
    client.routes.update.mockResolvedValue({
      status: 200,
      body: ROUTE_EXAMPLE,
    });
    client.routes.remove.mockResolvedValue({ status: 204, body: undefined });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const list = renderHook(() => useRoutes(), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    expect(list.result.current.data).toEqual([ROUTE_EXAMPLE]);

    const detail = renderHook(() => useRoute('r1'), { wrapper });
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    expect(client.routes.get).toHaveBeenCalledWith({ params: { id: 'r1' } });

    const create = renderHook(() => useCreateRoute(), { wrapper });
    create.result.current.mutate({
      direction: 'outbound',
      match: '+1*',
      destination: 'softphone',
    });
    await waitFor(() => expect(create.result.current.isSuccess).toBe(true));

    const update = renderHook(() => useUpdateRoute('r1'), { wrapper });
    update.result.current.mutate({ priority: 5 });
    await waitFor(() => expect(update.result.current.isSuccess).toBe(true));
    expect(client.routes.update).toHaveBeenCalledWith({
      params: { id: 'r1' },
      body: { priority: 5 },
    });

    const remove = renderHook(() => useDeleteRoute(), { wrapper });
    remove.result.current.mutate('r1');
    await waitFor(() => expect(remove.result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: routeKeys.all });
  });
});

describe('routes hooks error paths', () => {
  it('surface server error messages', async () => {
    client.routes.list.mockResolvedValue(err('list bad'));
    client.routes.get.mockResolvedValue(err('get bad'));
    client.routes.create.mockResolvedValue(err('create bad'));
    client.routes.update.mockResolvedValue(err('update bad'));
    client.routes.remove.mockResolvedValue(err('remove bad'));

    const list = renderHook(() => useRoutes(), { wrapper });
    await waitFor(() => expect(list.result.current.isError).toBe(true));
    expect(list.result.current.error?.message).toBe('list bad');

    const detail = renderHook(() => useRoute('r1'), { wrapper });
    await waitFor(() => expect(detail.result.current.isError).toBe(true));
    expect(detail.result.current.error?.message).toBe('get bad');

    const create = renderHook(() => useCreateRoute(), { wrapper });
    create.result.current.mutate({
      direction: 'inbound',
      match: 'x',
      destination: 't1',
    });
    await waitFor(() => expect(create.result.current.isError).toBe(true));
    expect(create.result.current.error?.message).toBe('create bad');

    const update = renderHook(() => useUpdateRoute('r1'), { wrapper });
    update.result.current.mutate({ priority: 1 });
    await waitFor(() => expect(update.result.current.isError).toBe(true));
    expect(update.result.current.error?.message).toBe('update bad');

    const remove = renderHook(() => useDeleteRoute(), { wrapper });
    remove.result.current.mutate('r1');
    await waitFor(() => expect(remove.result.current.isError).toBe(true));
    expect(remove.result.current.error?.message).toBe('remove bad');
  });
});
