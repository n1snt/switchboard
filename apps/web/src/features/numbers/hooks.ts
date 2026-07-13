// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  PhoneNumber,
  PhoneNumberCreate,
  PhoneNumberUpdate,
} from '@switchboard/shared';
import { apiClient, apiErrorMessage } from '@/lib/api';

// TanStack Query hooks for the numbers (DID) resource, mirroring the trunk
// hooks: query functions unwrap the ts-rest result and mutations invalidate the
// number cache.

export const numberKeys = {
  all: ['numbers'] as const,
  detail: (id: string) => ['numbers', id] as const,
};

async function listNumbers(): Promise<PhoneNumber[]> {
  const res = await apiClient.numbers.list();
  if (res.status === 200) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function getNumber(id: string): Promise<PhoneNumber> {
  const res = await apiClient.numbers.get({ params: { id } });
  if (res.status === 200) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function createNumber(body: PhoneNumberCreate): Promise<PhoneNumber> {
  const res = await apiClient.numbers.create({ body });
  if (res.status === 201) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function updateNumber(
  id: string,
  body: PhoneNumberUpdate,
): Promise<PhoneNumber> {
  const res = await apiClient.numbers.update({ params: { id }, body });
  if (res.status === 200) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function deleteNumber(id: string): Promise<void> {
  const res = await apiClient.numbers.remove({ params: { id } });
  if (res.status === 204) {
    return;
  }
  throw new Error(apiErrorMessage(res.body));
}

export function useNumbers(): UseQueryResult<PhoneNumber[]> {
  return useQuery({ queryKey: numberKeys.all, queryFn: listNumbers });
}

export function useNumber(id: string): UseQueryResult<PhoneNumber> {
  return useQuery({
    queryKey: numberKeys.detail(id),
    queryFn: () => getNumber(id),
  });
}

export function useCreateNumber(): UseMutationResult<
  PhoneNumber,
  Error,
  PhoneNumberCreate
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PhoneNumberCreate) => createNumber(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: numberKeys.all });
    },
  });
}

export function useUpdateNumber(
  id: string,
): UseMutationResult<PhoneNumber, Error, PhoneNumberUpdate> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PhoneNumberUpdate) => updateNumber(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: numberKeys.all });
    },
  });
}

export function useDeleteNumber(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNumber(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: numberKeys.all });
    },
  });
}
