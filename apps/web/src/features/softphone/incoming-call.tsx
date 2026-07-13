// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { Phone, PhoneOff } from 'lucide-react';
import type { ReactNode } from 'react';
import type { IncomingCallInfo } from '@/features/softphone/adapter';
import { Button } from '@/components/ui/button';
import { useSoftphoneStore } from '@/stores/softphone';

// One FaceTime-style incoming-call card: the caller, the trunk it arrived on,
// and Accept/Decline. It is a compact card (never a modal takeover) and is
// stacked by the overlay when several calls arrive at once.

export function IncomingCall({ call }: { call: IncomingCallInfo }): ReactNode {
  const accept = useSoftphoneStore((state) => state.acceptIncoming);
  const decline = useSoftphoneStore((state) => state.declineIncoming);

  return (
    <div className="w-72 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs uppercase tracking-wide text-neutral-500">
        Incoming call
      </p>
      <p className="mt-1 font-mono text-sm">{call.from}</p>
      <p className="text-xs text-neutral-500">via {call.via}</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => {
            decline(call.id);
          }}
        >
          <PhoneOff className="h-4 w-4" aria-hidden="true" />
          Decline
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => {
            accept(call.id);
          }}
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          Accept
        </Button>
      </div>
    </div>
  );
}
