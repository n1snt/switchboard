// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useDeleteNumber, useNumbers } from '@/features/numbers/hooks';
import { useTrunks } from '@/features/trunks/hooks';
import { confirmAction } from '@/lib/confirm';

export const Route = createFileRoute('/numbers/')({ component: NumbersList });

function NumbersList(): ReactNode {
  const numbers = useNumbers();
  const trunks = useTrunks();
  const remove = useDeleteNumber();

  const trunkName = (id: string): string =>
    trunks.data?.find((trunk) => trunk.id === id)?.name ?? id;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Numbers</h1>
        <Button asChild>
          <Link to="/numbers/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New number
          </Link>
        </Button>
      </div>

      {numbers.isPending ? (
        <p className="text-neutral-500">Loading numbers…</p>
      ) : numbers.isError ? (
        <p className="text-red-600 dark:text-red-400">
          {numbers.error.message}
        </p>
      ) : numbers.data.length === 0 ? (
        <p className="text-neutral-600 dark:text-neutral-400">
          No numbers yet. Add a phone number and assign it to an inbound trunk.
        </p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Number</TH>
              <TH>Trunk</TH>
              <TH>Label</TH>
              <TH>
                <span className="sr-only">Actions</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {numbers.data.map((number) => (
              <TR key={number.id}>
                <TD className="font-mono text-xs">
                  <Link
                    to="/numbers/$numberId"
                    params={{ numberId: number.id }}
                    className="text-blue-700 hover:underline"
                  >
                    {number.e164}
                  </Link>
                </TD>
                <TD>{trunkName(number.trunk_id)}</TD>
                <TD>{number.label ?? '—'}</TD>
                <TD>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${number.e164}`}
                    onClick={() => {
                      if (confirmAction(`Delete number ${number.e164}?`)) {
                        remove.mutate(number.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </section>
  );
}
