// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { LabelHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// A styled form label. `htmlFor` associates it with its control for a11y.

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps): ReactNode {
  return (
    <label
      className={cn(
        'text-sm font-medium text-neutral-700 dark:text-neutral-300',
        className,
      )}
      {...props}
    />
  );
}
