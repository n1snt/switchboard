// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { PhoneOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useSoftphoneStore } from '@/stores/softphone';

// Shown while an outgoing call is dialling or ringing: the destination being
// called and a Cancel control (see the dialler flow in ux.md).

export function CallingPanel(): ReactNode {
  const activeCall = useSoftphoneStore((state) => state.activeCall);
  const callState = useSoftphoneStore((state) => state.callState);
  const hangup = useSoftphoneStore((state) => state.hangup);
  const reset = useSoftphoneStore((state) => state.reset);

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-12">
      <p className="text-sm uppercase tracking-wide text-amber-600">
        {callState === 'ringing' ? 'Ringing' : 'Calling'}
      </p>
      <p className="font-mono text-lg">{activeCall?.peer}</p>
      <Button
        type="button"
        variant="danger"
        onClick={() => {
          hangup();
          reset();
        }}
      >
        <PhoneOff className="h-4 w-4" aria-hidden="true" />
        Cancel
      </Button>
    </section>
  );
}
