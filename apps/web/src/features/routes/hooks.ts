// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Route, RouteCreate, RouteUpdate } from '@switchboard/shared';
import { apiClient, apiErrorMessage } from '@/lib/api';

// TanStack Query hooks for the routing-rules resource, following the same CRUD
// shape as trunks and numbers.

export const routeKeys = {
  all: ['routes'] as const,
  detail: (id: string) => ['routes', id] as const,
};

async function listRoutes(): Promise<Route[]> {
  const res = await apiClient.routes.list();
  if (res.status === 200) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function getRoute(id: string): Promise<Route> {
  const res = await apiClient.routes.get({ params: { id } });
  if (res.status === 200) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function createRoute(body: RouteCreate): Promise<Route> {
  const res = await apiClient.routes.create({ body });
  if (res.status === 201) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function updateRoute(id: string, body: RouteUpdate): Promise<Route> {
  const res = await apiClient.routes.update({ params: { id }, body });
  if (res.status === 200) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function deleteRoute(id: string): Promise<void> {
  const res = await apiClient.routes.remove({ params: { id } });
  if (res.status === 204) {
    return;
  }
  throw new Error(apiErrorMessage(res.body));
}

export function useRoutes(): UseQueryResult<Route[]> {
  return useQuery({ queryKey: routeKeys.all, queryFn: listRoutes });
}

export function useRoute(id: string): UseQueryResult<Route> {
  return useQuery({
    queryKey: routeKeys.detail(id),
    queryFn: () => getRoute(id),
  });
}

export function useCreateRoute(): UseMutationResult<Route, Error, RouteCreate> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RouteCreate) => createRoute(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: routeKeys.all });
    },
  });
}

export function useUpdateRoute(
  id: string,
): UseMutationResult<Route, Error, RouteUpdate> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RouteUpdate) => updateRoute(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: routeKeys.all });
    },
  });
}

export function useDeleteRoute(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRoute(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: routeKeys.all });
    },
  });
}
