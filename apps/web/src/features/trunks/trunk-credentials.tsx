// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react';
import type { Trunk } from '@switchboard/shared';
import { CopyButton } from '@/components/ui/copy-button';
import { trunkAddress } from '@/lib/format';

// A read-only, copyable view of a trunk's endpoint and credentials, the same
// values a real carrier dashboard would show. Reused on the trunk editor and in
// the Settings credentials overview (see dashboard.md).

function Row({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="flex items-center gap-1">
        <code className="font-mono text-sm">{value}</code>
        <CopyButton value={value} label={`Copy ${label}`} />
      </span>
    </div>
  );
}

export function TrunkCredentials({ trunk }: { trunk: Trunk }): ReactNode {
  return (
    <div className="rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <Row label="Address" value={trunkAddress(trunk)} />
      <div className="flex items-center justify-between gap-2 py-1">
        <span className="text-sm text-neutral-500">Auth</span>
        <span className="text-sm">{trunk.auth_mode}</span>
      </div>
      {trunk.username === undefined ? null : (
        <Row label="Username" value={trunk.username} />
      )}
      {trunk.password === undefined ? null : (
        <Row label="Password" value={trunk.password} />
      )}
    </div>
  );
}
