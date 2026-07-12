// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';

export const Route = createFileRoute('/numbers/$numberId')({
  component: EditNumber,
});

function EditNumber(): ReactNode {
  const { numberId } = Route.useParams();
  return (
    <EmptyState
      title="Edit number"
      message={`The editor for number ${numberId} arrives with the numbers feature.`}
    />
  );
}
