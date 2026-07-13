// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { HTMLAttributes, ReactNode, TdHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// A light data-table wrapper: compact rows and a horizontal-scroll container so
// a wide table never makes the page scroll sideways (see ux.md responsive
// notes). Plain semantic table elements underneath.

export function Table({
  className,
  ...props
}: HTMLAttributes<HTMLTableElement>): ReactNode {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
      <table className={cn('w-full text-left text-sm', className)} {...props} />
    </div>
  );
}

export function THead({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>): ReactNode {
  return (
    <thead
      className={cn(
        'border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800',
        className,
      )}
      {...props}
    />
  );
}

export function TBody(
  props: HTMLAttributes<HTMLTableSectionElement>,
): ReactNode {
  return <tbody {...props} />;
}

export function TR({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>): ReactNode {
  return (
    <tr
      className={cn(
        'border-b border-neutral-100 last:border-0 dark:border-neutral-900',
        className,
      )}
      {...props}
    />
  );
}

export function TH({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>): ReactNode {
  return <th className={cn('px-3 py-2 font-medium', className)} {...props} />;
}

export function TD({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>): ReactNode {
  return <td className={cn('px-3 py-2 align-middle', className)} {...props} />;
}
