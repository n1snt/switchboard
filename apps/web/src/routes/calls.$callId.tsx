// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';

export const Route = createFileRoute('/calls/$callId')({
  component: CallDetail,
});

function CallDetail(): ReactNode {
  const { callId } = Route.useParams();
  return (
    <EmptyState
      title="Call detail"
      message={`The timeline and SIP ladder for call ${callId} arrive with the call-detail feature.`}
    />
  );
}
