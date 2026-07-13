// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { initClient } from '@ts-rest/core';
import {
  contract,
  ErrorSchema,
  HealthSchema,
  type Health,
} from '@switchboard/shared';

// A tiny typed client for the endpoints the skeleton needs. Relative URLs only,
// so the same code works behind the switchboard-web nginx proxy in production
// and the Vite dev proxy in development. Every response is validated with the
// shared Zod schema at the boundary before it is trusted.

/**
 * The typed REST client, generated once from the shared ts-rest contract. An
 * empty baseUrl keeps every request relative (`/api/v1/...`) so the same build
 * works behind the nginx proxy in production and the Vite dev proxy locally.
 */
export const apiClient = initClient(contract, {
  baseUrl: '',
  baseHeaders: {},
});

/**
 * Pull a human-readable message out of an error response body. Falls back to a
 * generic line when the body is not the shared error envelope, so a hook can
 * always surface something useful to TanStack Query.
 */
export function apiErrorMessage(body: unknown): string {
  const parsed = ErrorSchema.safeParse(body);
  return parsed.success ? parsed.data.error.message : 'Request failed';
}

/**
 * URL of a call's recording download. This binary endpoint is intentionally not
 * in the ts-rest contract; the browser uses the URL directly in an <audio> src
 * and a download link.
 */
export function recordingUrl(callId: string): string {
  return `/api/v1/calls/${callId}/recording`;
}

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
