// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { CallStateSchema, type CallListQuery } from '@switchboard/shared';

// The call log's filters live in typed, validated search params so a filtered
// view is shareable and survives reload (see ux.md). A bad query string is
// coerced away (`.catch(undefined)`) rather than crashing the screen. Dates are
// held as plain YYYY-MM-DD in the URL and widened to a full-day ISO range when
// the API query is built.

export const CallSearchSchema = z.object({
  direction: z.enum(['placed', 'received']).optional().catch(undefined),
  trunk_id: z.string().optional().catch(undefined),
  state: CallStateSchema.optional().catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
});

export type CallSearch = z.infer<typeof CallSearchSchema>;

/** Map a URL search state to the shared API query, omitting blank filters. */
export function searchToQuery(search: CallSearch): CallListQuery {
  return {
    ...(search.direction !== undefined ? { direction: search.direction } : {}),
    ...(search.trunk_id !== undefined && search.trunk_id !== ''
      ? { trunk_id: search.trunk_id }
      : {}),
    ...(search.state !== undefined ? { state: search.state } : {}),
    ...(search.from !== undefined && search.from !== ''
      ? { from: `${search.from}T00:00:00.000Z` }
      : {}),
    ...(search.to !== undefined && search.to !== ''
      ? { to: `${search.to}T23:59:59.999Z` }
      : {}),
  };
}

/** Merge a single filter change into the current search, clearing on blank. */
export function updateSearch(
  current: CallSearch,
  key: keyof CallSearch,
  value: string,
): CallSearch {
  const next: CallSearch = { ...current };
  if (value === '') {
    delete next[key];
  } else {
    next[key] = value as never;
  }
  return next;
}
