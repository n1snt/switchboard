// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';

export const Route = createFileRoute('/trunks/$trunkId')({
  component: EditTrunk,
});

function EditTrunk(): ReactNode {
  const { trunkId } = Route.useParams();
  return (
    <EmptyState
      title="Edit trunk"
      message={`The editor for trunk ${trunkId} arrives with the trunks feature.`}
    />
  );
}
