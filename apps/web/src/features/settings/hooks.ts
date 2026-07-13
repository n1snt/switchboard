// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Settings, SettingsUpdate } from '@switchboard/shared';
import { apiClient, apiErrorMessage } from '@/lib/api';

// TanStack Query hooks for the global settings singleton (record-all, etc.).
// Reading and updating both go through the settings endpoint; a successful
// update invalidates the cached settings.

export const settingsKeys = {
  all: ['settings'] as const,
};

async function getSettings(): Promise<Settings> {
  const res = await apiClient.settings.get();
  if (res.status === 200) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

async function updateSettings(body: SettingsUpdate): Promise<Settings> {
  const res = await apiClient.settings.update({ body });
  if (res.status === 200) {
    return res.body;
  }
  throw new Error(apiErrorMessage(res.body));
}

export function useSettings(): UseQueryResult<Settings> {
  return useQuery({ queryKey: settingsKeys.all, queryFn: getSettings });
}

export function useUpdateSettings(): UseMutationResult<
  Settings,
  Error,
  SettingsUpdate
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SettingsUpdate) => updateSettings(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
