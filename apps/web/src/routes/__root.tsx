// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createRootRoute, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Header } from '@/components/shell/header';
import { Sidebar } from '@/components/shell/sidebar';

// The application shell: a persistent header, the collapsible left sidebar, and
// the routed content in an <Outlet />. Two slots are reserved but inert for the
// skeleton: the docked call bar (feature 20) and the global incoming-call
// overlay (feature 19).

export const Route = createRootRoute({ component: RootLayout });

function RootLayout(): ReactNode {
  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
      {/* Docked call-bar slot: activated in feature 20. */}
      {/* Global incoming-call overlay slot: activated in feature 19. */}
    </div>
  );
}
