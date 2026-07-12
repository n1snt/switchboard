// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';

export const Route = createFileRoute('/trunks/new')({ component: NewTrunk });

function NewTrunk(): ReactNode {
  return (
    <EmptyState
      title="New trunk"
      message="The advanced create form arrives with the trunks feature."
    />
  );
}
