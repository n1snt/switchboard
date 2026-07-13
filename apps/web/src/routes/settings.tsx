// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings, useUpdateSettings } from '@/features/settings/hooks';
import { TrunkCredentials } from '@/features/trunks/trunk-credentials';
import { useTrunks } from '@/features/trunks/hooks';
import { fetchHealth, healthQueryKey } from '@/lib/api';

// Settings, with contextual tabs (see dashboard.md): Recording (the record-all
// toggle), Engine (connection status and version), Environment (read-only
// env-seeded trunks), and a read-only, copyable Credentials overview. Each tab
// is its own component so it fetches only when shown.

export const Route = createFileRoute('/settings')({
  component: SettingsScreen,
});

function RecordingTab(): ReactNode {
  const settings = useSettings();
  const update = useUpdateSettings();

  if (settings.isPending) {
    return <p className="text-neutral-500">Loading settings…</p>;
  }
  if (settings.isError) {
    return (
      <p className="text-red-600 dark:text-red-400">{settings.error.message}</p>
    );
  }

  return (
    <label className="flex items-center gap-3 text-sm">
      <Switch
        checked={settings.data.record_all_calls}
        onCheckedChange={(checked) => {
          update.mutate({ record_all_calls: checked });
        }}
        aria-label="Record all calls"
      />
      Record all calls by default
    </label>
  );
}

function EngineTab(): ReactNode {
  const health = useQuery({
    queryKey: healthQueryKey,
    queryFn: ({ signal }) => fetchHealth(signal),
  });

  if (health.isPending) {
    return <p className="text-neutral-500">Checking engine…</p>;
  }
  if (health.isError) {
    return (
      <p className="text-red-600 dark:text-red-400">
        Cannot reach the control plane.
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-2 text-sm">
      <dt className="text-neutral-500">Engine connection</dt>
      <dd>
        <Badge
          variant={health.data.engine === 'connected' ? 'success' : 'danger'}
        >
          {health.data.engine}
        </Badge>
      </dd>
      <dt className="text-neutral-500">Control-plane version</dt>
      <dd className="font-mono">{health.data.version}</dd>
    </dl>
  );
}

function EnvironmentTab(): ReactNode {
  const trunks = useTrunks();
  const envTrunks = (trunks.data ?? []).filter(
    (trunk) => trunk.source === 'env',
  );

  if (envTrunks.length === 0) {
    return (
      <p className="text-neutral-600 dark:text-neutral-400">
        No environment-managed items.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-neutral-500">
        These are seeded from the environment and re-applied on every restart.
      </p>
      <ul className="flex flex-col gap-1">
        {envTrunks.map((trunk) => (
          <li key={trunk.id} className="flex items-center gap-2 text-sm">
            {trunk.name}
            <Badge variant="neutral" title="Resets on restart.">
              env
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CredentialsTab(): ReactNode {
  const trunks = useTrunks();
  const list = trunks.data ?? [];

  if (list.length === 0) {
    return (
      <p className="text-neutral-600 dark:text-neutral-400">
        No trunks configured yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {list.map((trunk) => (
        <div key={trunk.id} className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">{trunk.name}</h3>
          <TrunkCredentials trunk={trunk} />
        </div>
      ))}
    </div>
  );
}

function SettingsScreen(): ReactNode {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <Tabs defaultValue="recording">
        <TabsList>
          <TabsTrigger value="recording">Recording</TabsTrigger>
          <TabsTrigger value="engine">Engine</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
        </TabsList>
        <TabsContent value="recording">
          <RecordingTab />
        </TabsContent>
        <TabsContent value="engine">
          <EngineTab />
        </TabsContent>
        <TabsContent value="environment">
          <EnvironmentTab />
        </TabsContent>
        <TabsContent value="credentials">
          <CredentialsTab />
        </TabsContent>
      </Tabs>
    </section>
  );
}
