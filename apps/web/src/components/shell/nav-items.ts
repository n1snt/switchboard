// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import {
  Phone,
  Server,
  Hash,
  Split,
  ScrollText,
  Zap,
  Settings,
  type LucideIcon,
} from 'lucide-react';

// The seven top-level destinations, in sidebar order (see ux.md). The union of
// paths is shared with the contextual tabs so every `to` is a real route.

export type NavPath =
  | '/phone'
  | '/trunks'
  | '/numbers'
  | '/routes'
  | '/calls'
  | '/faults'
  | '/settings';

export interface NavItem {
  to: NavPath;
  label: string;
  Icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/phone', label: 'Phone', Icon: Phone },
  { to: '/trunks', label: 'Trunks', Icon: Server },
  { to: '/numbers', label: 'Numbers', Icon: Hash },
  { to: '/routes', label: 'Routes', Icon: Split },
  { to: '/calls', label: 'Call log', Icon: ScrollText },
  { to: '/faults', label: 'Faults', Icon: Zap },
  { to: '/settings', label: 'Settings', Icon: Settings },
];
