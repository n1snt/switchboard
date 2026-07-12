// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react';
import { EngineIndicator } from './engine-indicator';
import { ThemeToggle } from './theme-toggle';

// The persistent header: product name on the left, the two always-on status
// controls (engine indicator, theme toggle) on the right.

export function Header(): ReactNode {
  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
      <span className="text-sm font-semibold tracking-tight">Switchboard</span>
      <div className="flex items-center gap-3">
        <EngineIndicator />
        <ThemeToggle />
      </div>
    </header>
  );
}
