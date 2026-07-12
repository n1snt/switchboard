// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

// The shared shape of a not-yet-populated screen: a heading, a one-line
// explanation of the next action, and an optional primary action. Every
// top-level destination in this skeleton renders through here.

export interface EmptyStateProps {
  title: string;
  message: string;
  /** Label for the primary action. Omitted when a screen has no primary action. */
  actionLabel?: string;
}

export function EmptyState({
  title,
  message,
  actionLabel,
}: EmptyStateProps): ReactNode {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-start gap-3 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-neutral-600 dark:text-neutral-400">{message}</p>
      {actionLabel ? (
        // Inert in the skeleton; each screen's real action arrives with its
        // own feature.
        <Button disabled>{actionLabel}</Button>
      ) : null}
    </section>
  );
}
