// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// A styled text input. A thin layer over a real <input> so native validation,
// refs, and form behavior all work; callers pass an id and wire the label.

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps): ReactNode {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100',
        className,
      )}
      {...props}
    />
  );
}
