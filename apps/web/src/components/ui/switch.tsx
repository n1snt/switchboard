// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import * as SwitchPrimitive from '@radix-ui/react-switch';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// A styled on/off switch over the Radix primitive (role="switch", full keyboard
// support). Used for the record-all setting and other boolean toggles.

export type SwitchProps = ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>;

export function Switch({ className, ...props }: SwitchProps): ReactNode {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-neutral-300 dark:data-[state=unchecked]:bg-neutral-700',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-4" />
    </SwitchPrimitive.Root>
  );
}
