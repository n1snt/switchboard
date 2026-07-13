// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { QuickAddDialog } from '@/features/trunks/quick-add-dialog';
import { useDeleteTrunk, useTrunks } from '@/features/trunks/hooks';
import { confirmAction } from '@/lib/confirm';
import { trunkAddress } from '@/lib/format';

export const Route = createFileRoute('/trunks/')({ component: TrunksList });

function TrunksList(): ReactNode {
  const trunks = useTrunks();
  const remove = useDeleteTrunk();

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Trunks</h1>
        <div className="flex gap-2">
          <QuickAddDialog />
          <Button asChild>
            <Link to="/trunks/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New trunk
            </Link>
          </Button>
        </div>
      </div>

      {trunks.isPending ? (
        <p className="text-neutral-500">Loading trunks…</p>
      ) : trunks.isError ? (
        <p className="text-red-600 dark:text-red-400">{trunks.error.message}</p>
      ) : trunks.data.length === 0 ? (
        <p className="text-neutral-600 dark:text-neutral-400">
          No trunks yet. Add a SIP server to place your first call.
        </p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Address</TH>
              <TH>Direction</TH>
              <TH>Auth</TH>
              <TH>Status</TH>
              <TH>
                <span className="sr-only">Actions</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {trunks.data.map((trunk) => (
              <TR key={trunk.id}>
                <TD>
                  <Link
                    to="/trunks/$trunkId"
                    params={{ trunkId: trunk.id }}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {trunk.name}
                  </Link>
                  {trunk.source === 'env' ? (
                    <Badge
                      variant="neutral"
                      className="ml-2"
                      title="Seeded from the environment; resets on restart."
                    >
                      env
                    </Badge>
                  ) : null}
                </TD>
                <TD className="font-mono text-xs">{trunkAddress(trunk)}</TD>
                <TD>{trunk.direction}</TD>
                <TD>{trunk.auth_mode}</TD>
                <TD>
                  <Badge variant={trunk.enabled ? 'success' : 'neutral'}>
                    {trunk.enabled ? 'enabled' : 'disabled'}
                  </Badge>
                </TD>
                <TD>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${trunk.name}`}
                    onClick={() => {
                      if (confirmAction(`Delete trunk ${trunk.name}?`)) {
                        remove.mutate(trunk.id);
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
