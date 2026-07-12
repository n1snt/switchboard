// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';

export const Route = createFileRoute('/numbers/new')({ component: NewNumber });

function NewNumber(): ReactNode {
  return (
    <EmptyState
      title="New number"
      message="The create form arrives with the numbers feature."
    />
  );
}
