// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Route as RoutingRule } from '@switchboard/shared';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { defaultRouteForm, routeToForm } from '@/features/routes/form-model';
import {
  useCreateRoute,
  useDeleteRoute,
  useRoutes,
  useUpdateRoute,
} from '@/features/routes/hooks';
import { RouteForm } from '@/features/routes/route-form';
import { confirmAction } from '@/lib/confirm';

// Routes is the advanced, secondary screen: a rule list plus an inline editor
// for creating and editing rules. Most users never open it (numbers reach their
// trunk by default); it exists for overrides.

export const Route = createFileRoute('/routes')({ component: RoutesScreen });

type EditorMode =
  { kind: 'none' } | { kind: 'new' } | { kind: 'edit'; rule: RoutingRule };

function RouteEditor({
  rule,
  onDone,
}: {
  rule: RoutingRule | null;
  onDone: () => void;
}): ReactNode {
  const create = useCreateRoute();
  const update = useUpdateRoute(rule?.id ?? '');
  const mutation = rule === null ? create : update;

  return (
    <RouteForm
      initialValues={rule === null ? defaultRouteForm() : routeToForm(rule)}
      submitLabel={rule === null ? 'Create rule' : 'Save rule'}
      submitting={mutation.isPending}
      submitError={mutation.error?.message}
      onCancel={onDone}
      onSubmit={(input) => {
        mutation.mutate(input, { onSuccess: onDone });
      }}
    />
  );
}

function RoutesScreen(): ReactNode {
  const routes = useRoutes();
  const remove = useDeleteRoute();
  const [mode, setMode] = useState<EditorMode>({ kind: 'none' });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Routes</h1>
        <Button
          type="button"
          onClick={() => {
            setMode({ kind: 'new' });
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New rule
        </Button>
      </div>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Numbers reach their assigned trunk by default. Add a rule only to
        override that.
      </p>

      {mode.kind === 'none' ? null : (
        <RouteEditor
          rule={mode.kind === 'edit' ? mode.rule : null}
          onDone={() => {
            setMode({ kind: 'none' });
          }}
        />
      )}

      {routes.isPending ? (
        <p className="text-neutral-500">Loading routes…</p>
      ) : routes.isError ? (
        <p className="text-red-600 dark:text-red-400">{routes.error.message}</p>
      ) : routes.data.length === 0 ? (
        <p className="text-neutral-600 dark:text-neutral-400">
          No routing rules yet.
        </p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Direction</TH>
              <TH>Match</TH>
              <TH>Destination</TH>
              <TH>Priority</TH>
              <TH>
                <span className="sr-only">Actions</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {routes.data.map((rule) => (
              <TR key={rule.id}>
                <TD>{rule.direction}</TD>
                <TD className="font-mono text-xs">{rule.match}</TD>
                <TD className="font-mono text-xs">{rule.destination}</TD>
                <TD>{rule.priority}</TD>
                <TD className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit rule ${rule.match}`}
                    onClick={() => {
                      setMode({ kind: 'edit', rule });
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete rule ${rule.match}`}
                    onClick={() => {
                      if (confirmAction(`Delete rule ${rule.match}?`)) {
                        remove.mutate(rule.id);
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
