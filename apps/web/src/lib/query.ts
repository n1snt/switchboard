// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { QueryClient } from '@tanstack/react-query';

/**
 * Build the TanStack Query client with the app's defaults. A factory (rather
 * than a shared singleton) so tests get an isolated cache per render.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The dashboard is a live control panel; keep data fresh but do not
        // hammer the API. Retries are off so a down engine surfaces quickly.
        retry: false,
        staleTime: 5_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}
