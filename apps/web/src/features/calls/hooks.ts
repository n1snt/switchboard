// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Call, CallDetail, CallListQuery } from '@switchboard/shared';
import { apiClient, apiErrorMessage } from '@/lib/api';

// TanStack Query hooks for the call log. The list is read-only (calls are
// written by the server from the event bus, not created via CRUD) and filtered
// through the shared query schema; the detail carries the SIP trace.

export const callKeys = {
  all: ['calls'] as const,
  list: (query: CallListQuery) => ['calls', 'list', query] as const,
  detail: (id: string) => ['calls', 'detail', id] as const,
};

async function listCalls(query: CallListQuery): Promise<Call[]> {
  const res = await apiClient.calls.list({ query });
  if (res.status === 200) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function getCall(id: string): Promise<CallDetail> {
  const res = await apiClient.calls.get({ params: { id } });
  if (res.status === 200) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

export function useCalls(query: CallListQuery): UseQueryResult<Call[]> {
  return useQuery({
    queryKey: callKeys.list(query),
    queryFn: () => listCalls(query),
  });
}

export function useCall(id: string): UseQueryResult<CallDetail> {
  return useQuery({
    queryKey: callKeys.detail(id),
    queryFn: () => getCall(id),
  });
}
