// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';

// The Call log section: the list at /calls plus a per-call detail sub-view.
export const Route = createFileRoute('/calls')({ component: CallsLayout });

function CallsLayout(): ReactNode {
  return <Outlet />;
}
