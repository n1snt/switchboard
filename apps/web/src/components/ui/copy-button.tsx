// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { copyToClipboard } from '@/lib/clipboard';

// A small copy-to-clipboard control. Shows a check once the value is copied, so
// the user gets confirmation without a global toast. The clipboard write itself
// lives in lib/clipboard so this stays pure UI glue.

export interface CopyButtonProps {
  /** The value placed on the clipboard. */
  value: string;
  /** Accessible label, e.g. "Copy address". */
  label: string;
}

export function CopyButton({ value, label }: CopyButtonProps): ReactNode {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    await copyToClipboard(value);
    setCopied(true);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={copied ? `${label} (copied)` : label}
      onClick={() => {
        void copy();
      }}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
