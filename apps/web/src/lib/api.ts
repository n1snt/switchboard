// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { HealthSchema, type Health } from '@switchboard/shared';

// A tiny typed client for the endpoints the skeleton needs. Relative URLs only,
// so the same code works behind the switchboard-web nginx proxy in production
// and the Vite dev proxy in development. Every response is validated with the
// shared Zod schema at the boundary before it is trusted.

/** Query key for the engine/health poll used by the header indicator. */
export const healthQueryKey = ['health'] as const;

/**
 * Fetch and validate `GET /api/v1/health`. Throws on a non-2xx response or a
 * body that does not match the shared schema, so TanStack Query treats a broken
 * or unreachable control plane as an error state.
 */
export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  const response = await fetch('/api/v1/health', signal ? { signal } : {});
  if (!response.ok) {
    throw new Error(`Health request failed: ${response.status}`);
  }
  const body: unknown = await response.json();
  return HealthSchema.parse(body);
}
