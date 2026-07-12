// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';

export const Route = createFileRoute('/faults')({ component: FaultsScreen });

function FaultsScreen(): ReactNode {
  return (
    <EmptyState
      title="Fault profiles"
      message="No fault profiles yet. Carrier fault injection arrives with milestone M3."
      actionLabel="New profile"
    />
  );
}
