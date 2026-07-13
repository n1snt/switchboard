// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

// The dial pad, shared by the dialler (appends digits to the target) and the
// in-call interface (sends DTMF). Standard telephone layout, keyboard-reachable
// because each key is a real button.

export const KEYPAD_KEYS: readonly string[] = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '*',
  '0',
  '#',
];

export function Keypad({
  onPress,
}: {
  onPress: (key: string) => void;
}): ReactNode {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Keypad">
      {KEYPAD_KEYS.map((key) => (
        <Button
          key={key}
          type="button"
          variant="secondary"
          aria-label={`Key ${key}`}
          onClick={() => {
            onPress(key);
          }}
        >
          {key}
        </Button>
      ))}
    </div>
  );
}
