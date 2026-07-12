// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// A small status pill. Semantic variants map to the meaning-only colors from
// the visual system: green connected, red error, amber transitional, gray idle.

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        neutral: 'border-neutral-300 bg-neutral-100 text-neutral-700',
        success: 'border-green-600/30 bg-green-600/10 text-green-700',
        danger: 'border-red-600/30 bg-red-600/10 text-red-700',
        warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): ReactNode {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
