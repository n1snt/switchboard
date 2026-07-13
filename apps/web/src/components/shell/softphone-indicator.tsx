// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { Phone, PhoneOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { useSoftphoneStore, type RegistrationStatus } from '@/stores/softphone';

// The always-visible browser-softphone registration status in the header,
// alongside the engine indicator. The softphone registers to the engine over
// SIP at startup (main.tsx); this reflects whether it is ready to place and
// receive calls. Carried by an icon and a label, never color alone (ux.md a11y).

const PRESENTATION: Record<
  RegistrationStatus,
  { label: string; variant: BadgeProps['variant']; ready: boolean }
> = {
  registered: { label: 'phone ready', variant: 'success', ready: true },
  registering: { label: 'registering', variant: 'warning', ready: false },
  unregistered: { label: 'phone offline', variant: 'neutral', ready: false },
  failed: { label: 'phone error', variant: 'danger', ready: false },
};

export function SoftphoneIndicator(): ReactNode {
  const registration = useSoftphoneStore((state) => state.registration);
  const { label, variant, ready } = PRESENTATION[registration];

  return (
    <Badge variant={variant} role="status" aria-live="polite">
      {ready ? (
        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <PhoneOff className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {label}
    </Badge>
  );
}
