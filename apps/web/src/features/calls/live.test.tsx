// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { CALL_EXAMPLE, type CallEvent } from '@switchboard/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const wsMock = vi.hoisted(() => ({ events: [] as CallEvent[] }));
vi.mock('@/lib/ws', () => ({ useCallEvents: () => wsMock.events }));

import { callKeys } from './hooks';
import { useCallLogLiveUpdates } from './live';

let queryClient: QueryClient;
function wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const event: CallEvent = {
  type: 'call.created',
  at: '2026-07-13T10:02:00.000Z',
  call: CALL_EXAMPLE,
};

beforeEach(() => {
  wsMock.events = [];
  queryClient = new QueryClient();
});

describe('useCallLogLiveUpdates', () => {
  it('invalidates the call queries when a new event arrives', () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { rerender } = renderHook(
      () => {
        useCallLogLiveUpdates();
      },
      { wrapper },
    );
    expect(invalidate).not.toHaveBeenCalled();

    wsMock.events = [event];
    rerender();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: callKeys.all });

    // No new events: no further invalidation.
    invalidate.mockClear();
    rerender();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
