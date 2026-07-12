// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { NavPath } from './nav-items';

// The tab strip shown inside sections that have more than one view. Each tab is
// a real route (a typed <Link>), so it is linkable and deep-linkable; the
// active tab is marked by TanStack Router's `data-status="active"`.

export interface TabItem {
  to: NavPath;
  label: string;
}

export function ContextualTabs({
  tabs,
}: {
  tabs: readonly TabItem[];
}): ReactNode {
  return (
    <nav
      aria-label="Section"
      className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          activeOptions={{ exact: true }}
          className={cn(
            '-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100',
            'data-[status=active]:border-blue-600 data-[status=active]:text-blue-700',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
