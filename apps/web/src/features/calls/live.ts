// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useCallEvents } from '@/lib/ws';
import { callKeys } from './hooks';

// Keeps the call log live: whenever a new call lifecycle event arrives on the
// WebSocket, invalidate the cached call queries so an in-progress call appears
// and changes state without a manual refresh (see dashboard.md).

export function useCallLogLiveUpdates(): void {
  const events = useCallEvents();
  const queryClient = useQueryClient();
  const processed = useRef(0);

  useEffect(() => {
    if (events.length > processed.current) {
      processed.current = events.length;
      void queryClient.invalidateQueries({ queryKey: callKeys.all });
    }
  }, [events, queryClient]);
}
