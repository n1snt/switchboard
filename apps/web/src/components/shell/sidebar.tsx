// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-items';

// The left navigation rail. Collapses to an icon-only rail (labels hidden,
// item labels surfaced as native tooltips) via the toggle at its foot. The
// active item is marked by TanStack Router's `data-status="active"`.

export function Sidebar(): ReactNode {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      aria-label="Primary"
      data-collapsed={collapsed}
      className={cn(
        'flex shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <ul className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              title={item.label}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                'data-[status=active]:bg-blue-600/10 data-[status=active]:font-medium data-[status=active]:text-blue-700',
              )}
            >
              <item.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {collapsed ? null : <span>{item.label}</span>}
            </Link>
          </li>
        ))}
      </ul>
      <div className="p-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
          onClick={() => {
            setCollapsed((value) => !value);
          }}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </nav>
  );
}
