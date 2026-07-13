// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Trunk, TrunkCreate, TrunkUpdate } from '@switchboard/shared';
import { apiClient, apiErrorMessage } from '@/lib/api';

// TanStack Query hooks for the trunks resource. The query functions unwrap the
// ts-rest result, returning the typed body on success and throwing the server's
// error message otherwise, so components see a plain data/error/loading shape.
// Mutations invalidate the trunk cache so the list and any open detail refetch.

export const trunkKeys = {
  all: ['trunks'] as const,
  detail: (id: string) => ['trunks', id] as const,
};

async function listTrunks(): Promise<Trunk[]> {
  const res = await apiClient.trunks.list();
  if (res.status === 200) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function getTrunk(id: string): Promise<Trunk> {
  const res = await apiClient.trunks.get({ params: { id } });
  if (res.status === 200) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function createTrunk(body: TrunkCreate): Promise<Trunk> {
  const res = await apiClient.trunks.create({ body });
  if (res.status === 201) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function updateTrunk(id: string, body: TrunkUpdate): Promise<Trunk> {
  const res = await apiClient.trunks.update({ params: { id }, body });
  if (res.status === 200) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function deleteTrunk(id: string): Promise<void> {
  const res = await apiClient.trunks.remove({ params: { id } });
  if (res.status === 204) {
    return;
  }
  throw new Error(apiErrorMessage(res.body));
}

export function useTrunks(): UseQueryResult<Trunk[]> {
  return useQuery({ queryKey: trunkKeys.all, queryFn: listTrunks });
}

export function useTrunk(id: string): UseQueryResult<Trunk> {
  return useQuery({
    queryKey: trunkKeys.detail(id),
    queryFn: () => getTrunk(id),
  });
}

export function useCreateTrunk(): UseMutationResult<Trunk, Error, TrunkCreate> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TrunkCreate) => createTrunk(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trunkKeys.all });
    },
  });
}

export function useUpdateTrunk(
  id: string,
): UseMutationResult<Trunk, Error, TrunkUpdate> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TrunkUpdate) => updateTrunk(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trunkKeys.all });
    },
  });
}

export function useDeleteTrunk(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTrunk(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trunkKeys.all });
    },
  });
}
