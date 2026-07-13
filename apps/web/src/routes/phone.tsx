// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { CallingPanel } from '@/features/softphone/calling-panel';
import { Dialler } from '@/features/softphone/dialler';
import { InCall } from '@/features/softphone/in-call';
import { useSoftphoneStore } from '@/stores/softphone';

// The Phone screen: the softphone. It shows the dialler when idle, the calling
// panel while an outgoing call is dialling or ringing, and the full in-call
// interface once connected. The incoming-call notification is global (the
// overlay in the shell), not part of this screen.
export const Route = createFileRoute('/phone')({ component: PhoneScreen });

function PhoneScreen(): ReactNode {
  const callState = useSoftphoneStore((state) => state.callState);

  if (callState === 'in-call') {
    return <InCall />;
  }
  if (callState === 'calling' || callState === 'ringing') {
    return <CallingPanel />;
  }
  return <Dialler />;
}
