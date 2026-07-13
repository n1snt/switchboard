// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

// A labelled form field with an optional inline error and hint. Wires the label
// to the control via `htmlFor`/`id` and shows the schema's validation message
// below the input, which is how the forms surface per-field errors.

export interface FieldProps {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  children: ReactNode;
}

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: FieldProps): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="flex items-center gap-1">
        {label}
        {hint}
      </Label>
      {children}
      {error === undefined ? null : (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
