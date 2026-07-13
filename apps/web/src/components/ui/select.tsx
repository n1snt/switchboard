// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { SelectHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// A styled native <select>. Native (not Radix) on purpose: it is fully
// keyboard- and screen-reader-accessible out of the box and deterministic under
// jsdom, which the 100% coverage gate relies on.

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({
  className,
  children,
  ...props
}: SelectProps): ReactNode {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
