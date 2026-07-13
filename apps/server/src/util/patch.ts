// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

/**
 * Merge a partial update over a full entity, ignoring keys whose value is
 * undefined, and return the entity type. This bridges the gap between a Zod
 * `.partial()` update body (whose optional fields include `undefined`) and the
 * required entity shape under exactOptionalPropertyTypes: an omitted field never
 * overwrites the existing value.
 */
export function applyUpdate<T extends object>(
  base: T,
  patch: Partial<Record<keyof T, unknown>>,
): T {
  const result: T = { ...base };
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const value = patch[key];
    if (value !== undefined) {
      (result as Record<keyof T, unknown>)[key] = value;
    }
  }
  return result;
}
