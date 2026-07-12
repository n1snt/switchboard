// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';

export const Route = createFileRoute('/phone')({ component: PhoneScreen });

function PhoneScreen(): ReactNode {
  return (
    <EmptyState
      title="Phone"
      message="No call in progress. Pick a destination and place a call to get started."
      actionLabel="Place a call"
    />
  );
}
