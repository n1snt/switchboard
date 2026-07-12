// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';

export const Route = createFileRoute('/trunks/')({ component: TrunksList });

function TrunksList(): ReactNode {
  return (
    <EmptyState
      title="Trunks"
      message="No trunks yet. Add a SIP server to place your first call."
      actionLabel="New trunk"
    />
  );
}
