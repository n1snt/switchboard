// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import {
  ContextualTabs,
  type TabItem,
} from '@/components/shell/contextual-tabs';

const TRUNK_TABS: readonly TabItem[] = [{ to: '/trunks', label: 'List' }];

// The Trunks section layout: a contextual tab strip over the routed sub-view.
export const Route = createFileRoute('/trunks')({ component: TrunksLayout });

function TrunksLayout(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <ContextualTabs tabs={TRUNK_TABS} />
      <Outlet />
    </div>
  );
}
