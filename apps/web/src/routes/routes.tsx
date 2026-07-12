// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';

export const Route = createFileRoute('/routes')({ component: RoutesScreen });

function RoutesScreen(): ReactNode {
  return (
    <EmptyState
      title="Routes"
      message="No routing rules yet. Numbers reach their assigned trunk by default; add a rule only to override that."
      actionLabel="New rule"
    />
  );
}
