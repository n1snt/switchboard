// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';

export const Route = createFileRoute('/settings')({
  component: SettingsScreen,
});

function SettingsScreen(): ReactNode {
  return (
    <EmptyState
      title="Settings"
      message="Recording, engine status, environment-managed items, and a credentials overview arrive with the settings feature."
    />
  );
}
