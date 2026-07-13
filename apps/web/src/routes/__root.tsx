// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createRootRoute, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { CallOverlay } from '@/components/call-overlay';
import { Header } from '@/components/shell/header';
import { Sidebar } from '@/components/shell/sidebar';
import { CallBar } from '@/features/softphone/call-bar';

// The application shell: a persistent header, the collapsible left sidebar, the
// routed content in an <Outlet />, the docked call bar (visible during a call),
// and the global incoming-call overlay floating above everything.

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
      <CallBar />
      <CallOverlay />
    </div>
  );
}
