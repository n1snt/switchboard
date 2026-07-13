// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { defaultTrunkForm } from '@/features/trunks/form-model';
import { useCreateTrunk } from '@/features/trunks/hooks';
import { TrunkForm } from '@/features/trunks/trunk-form';

export const Route = createFileRoute('/trunks/new')({ component: NewTrunk });

function NewTrunk(): ReactNode {
  const navigate = useNavigate();
  const create = useCreateTrunk();

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">New trunk</h1>
      <TrunkForm
        initialValues={defaultTrunkForm()}
        submitLabel="Save trunk"
        submitting={create.isPending}
        submitError={create.error?.message}
        onCancel={() => {
          void navigate({ to: '/trunks' });
        }}
        onSubmit={(input) => {
          create.mutate(input, {
            onSuccess: () => {
              void navigate({ to: '/trunks' });
            },
          });
        }}
      />
    </section>
  );
}
