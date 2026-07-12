// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { ZodType } from 'zod';

// Edge mappers between SQLite column types and domain values. Booleans are stored
// as integers (0/1) and JSON columns as text; every repository uses these so the
// database boundary stays typed and validated.

/** Domain boolean to a SQLite integer column. */
export function toDbBool(value: boolean): number {
  return value ? 1 : 0;
}

/** SQLite integer column to a domain boolean. */
export function fromDbBool(value: number): boolean {
  return value !== 0;
}

/** Serialize a JSON column value to text for storage. */
export function toJsonColumn(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Parse a JSON text column and validate it with the owning entity's Zod schema,
 * so a corrupt or stale column is rejected at the boundary rather than trusted.
 */
export function fromJsonColumn<T>(text: string, schema: ZodType<T>): T {
  return schema.parse(JSON.parse(text));
}
