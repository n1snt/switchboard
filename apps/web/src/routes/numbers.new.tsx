// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { defaultNumberForm } from '@/features/numbers/form-model';
import { useCreateNumber } from '@/features/numbers/hooks';
import { NumberForm } from '@/features/numbers/number-form';
import { useTrunks } from '@/features/trunks/hooks';

export const Route = createFileRoute('/numbers/new')({ component: NewNumber });

function NewNumber(): ReactNode {
  const navigate = useNavigate();
  const trunks = useTrunks();
  const create = useCreateNumber();

  return (
    <section className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">New number</h1>
      <NumberForm
        trunks={trunks.data ?? []}
        initialValues={defaultNumberForm()}
        submitLabel="Save number"
        submitting={create.isPending}
        submitError={create.error?.message}
        onCancel={() => {
          void navigate({ to: '/numbers' });
        }}
        onSubmit={(input) => {
          create.mutate(input, {
            onSuccess: () => {
              void navigate({ to: '/numbers' });
            },
          });
        }}
      />
    </section>
  );
}
