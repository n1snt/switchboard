// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { createQueryClient } from './query';

describe('createQueryClient', () => {
  it('builds a QueryClient with the app defaults', () => {
    const client = createQueryClient();
    expect(client).toBeInstanceOf(QueryClient);
    const defaults = client.getDefaultOptions().queries;
    expect(defaults?.retry).toBe(false);
    expect(defaults?.staleTime).toBe(5_000);
    expect(defaults?.refetchOnWindowFocus).toBe(false);
  });

  it('returns an isolated client each call', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
