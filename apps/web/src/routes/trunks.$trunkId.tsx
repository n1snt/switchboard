// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { trunkToForm } from '@/features/trunks/form-model';
import { useTrunk, useUpdateTrunk } from '@/features/trunks/hooks';
import { TrunkCredentials } from '@/features/trunks/trunk-credentials';
import { TrunkForm } from '@/features/trunks/trunk-form';

export const Route = createFileRoute('/trunks/$trunkId')({
  component: EditTrunk,
});

function EditTrunk(): ReactNode {
  const { trunkId } = Route.useParams();
  const navigate = useNavigate();
  const trunk = useTrunk(trunkId);
  const update = useUpdateTrunk(trunkId);

  if (trunk.isPending) {
    return <p className="text-neutral-500">Loading trunk…</p>;
  }
  if (trunk.isError) {
    return (
      <p className="text-red-600 dark:text-red-400">{trunk.error.message}</p>
    );
  }

  const data = trunk.data;

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Edit trunk</h1>
        {data.source === 'env' ? (
          <Badge variant="neutral" title="Resets on restart.">
            env
          </Badge>
        ) : null}
      </div>

      {data.source === 'env' ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          This trunk is managed by the environment. Edits are allowed but are
          overwritten on the next restart.
        </p>
      ) : null}

      <TrunkCredentials trunk={data} />

      <TrunkForm
        initialValues={trunkToForm(data)}
        submitLabel="Save changes"
        submitting={update.isPending}
        submitError={update.error?.message}
        onCancel={() => {
          void navigate({ to: '/trunks' });
        }}
        onSubmit={(input) => {
          update.mutate(input, {
            onSuccess: () => {
              void navigate({ to: '/trunks' });
            },
          });
        }}
      />
    </section>
  );
}
