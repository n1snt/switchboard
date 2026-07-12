// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';

// The Numbers section is a plain list with create/edit sub-views; the layout is
// a simple pass-through to the routed content.
export const Route = createFileRoute('/numbers')({ component: NumbersLayout });

function NumbersLayout(): ReactNode {
  return <Outlet />;
}
