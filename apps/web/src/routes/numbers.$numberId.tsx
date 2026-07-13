// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { numberToForm } from '@/features/numbers/form-model';
import { useNumber, useUpdateNumber } from '@/features/numbers/hooks';
import { NumberForm } from '@/features/numbers/number-form';
import { useTrunks } from '@/features/trunks/hooks';

export const Route = createFileRoute('/numbers/$numberId')({
  component: EditNumber,
});

function EditNumber(): ReactNode {
  const { numberId } = Route.useParams();
  const navigate = useNavigate();
  const number = useNumber(numberId);
  const trunks = useTrunks();
  const update = useUpdateNumber(numberId);

  if (number.isPending) {
    return <p className="text-neutral-500">Loading number…</p>;
  }
  if (number.isError) {
    return (
      <p className="text-red-600 dark:text-red-400">{number.error.message}</p>
    );
  }

  return (
    <section className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit number</h1>
      <NumberForm
        trunks={trunks.data ?? []}
        initialValues={numberToForm(number.data)}
        submitLabel="Save changes"
        submitting={update.isPending}
        submitError={update.error?.message}
        onCancel={() => {
          void navigate({ to: '/numbers' });
        }}
        onSubmit={(input) => {
          update.mutate(input, {
            onSuccess: () => {
              void navigate({ to: '/numbers' });
            },
          });
        }}
      />
    </section>
  );
}
