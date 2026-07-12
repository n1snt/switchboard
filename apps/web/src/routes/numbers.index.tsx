// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';

export const Route = createFileRoute('/numbers/')({ component: NumbersList });

function NumbersList(): ReactNode {
  return (
    <EmptyState
      title="Numbers"
      message="No numbers yet. Add a phone number and assign it to an inbound trunk."
      actionLabel="New number"
    />
  );
}
