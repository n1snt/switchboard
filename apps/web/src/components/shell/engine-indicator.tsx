// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { fetchHealth, healthQueryKey } from '@/lib/api';

// The always-visible engine-connection status in the header. Green "engine ok"
// only when the control plane reports it is connected to the engine over ARI;
// otherwise red "engine down". Status is carried by an icon and a label, never
// color alone (see the a11y notes in ux.md).

export function EngineIndicator(): ReactNode {
  const query = useQuery({
    queryKey: healthQueryKey,
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 10_000,
  });

  const connected = query.data?.engine === 'connected';

  return (
    <Badge
      variant={connected ? 'success' : 'danger'}
      role="status"
      aria-live="polite"
    >
      {connected ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {connected ? 'engine ok' : 'engine down'}
    </Badge>
  );
}
