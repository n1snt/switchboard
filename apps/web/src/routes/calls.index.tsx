// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { CallState } from '@switchboard/shared';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import {
  CallSearchSchema,
  searchToQuery,
  updateSearch,
  type CallSearch,
} from '@/features/calls/filters';
import { useCalls } from '@/features/calls/hooks';
import { useCallLogLiveUpdates } from '@/features/calls/live';
import { RecordingPlayer } from '@/features/calls/recording-player';
import { useTrunks } from '@/features/trunks/hooks';
import {
  callDurationSeconds,
  callParty,
  codecLabel,
  directionLabel,
  formatDuration,
  formatTimestamp,
} from '@/lib/format';

export const Route = createFileRoute('/calls/')({
  component: CallLog,
  validateSearch: (raw): CallSearch => CallSearchSchema.parse(raw),
});

const STATE_VARIANTS: Record<
  CallState,
  'neutral' | 'success' | 'warning' | 'danger'
> = {
  created: 'neutral',
  ringing: 'warning',
  answered: 'success',
  ended: 'neutral',
};

const STATES: readonly CallState[] = [
  'created',
  'ringing',
  'answered',
  'ended',
];

function durationLabel(duration: number | null, state: CallState): string {
  if (duration !== null) {
    return formatDuration(duration);
  }
  return state === 'ended' ? 'failed' : '—';
}

function CallLog(): ReactNode {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const calls = useCalls(searchToQuery(search));
  const trunks = useTrunks();
  useCallLogLiveUpdates();

  const trunkName = (id: string | null): string =>
    id === null ? '—' : (trunks.data?.find((t) => t.id === id)?.name ?? id);

  const change = (key: keyof CallSearch) => (value: string) => {
    void navigate({ search: updateSearch(search, key, value) });
  };

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Call log</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field id="filter-direction" label="Direction">
          <Select
            id="filter-direction"
            value={search.direction ?? ''}
            onChange={(event) => {
              change('direction')(event.target.value);
            }}
          >
            <option value="">All</option>
            <option value="placed">Placed</option>
            <option value="received">Received</option>
          </Select>
        </Field>
        <Field id="filter-trunk" label="Trunk">
          <Select
            id="filter-trunk"
            value={search.trunk_id ?? ''}
            onChange={(event) => {
              change('trunk_id')(event.target.value);
            }}
          >
            <option value="">All</option>
            {(trunks.data ?? []).map((trunk) => (
              <option key={trunk.id} value={trunk.id}>
                {trunk.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="filter-state" label="State">
          <Select
            id="filter-state"
            value={search.state ?? ''}
            onChange={(event) => {
              change('state')(event.target.value);
            }}
          >
            <option value="">All</option>
            {STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="filter-from" label="From">
          <Input
            id="filter-from"
            type="date"
            value={search.from ?? ''}
            onChange={(event) => {
              change('from')(event.target.value);
            }}
          />
        </Field>
        <Field id="filter-to" label="To">
          <Input
            id="filter-to"
            type="date"
            value={search.to ?? ''}
            onChange={(event) => {
              change('to')(event.target.value);
            }}
          />
        </Field>
      </div>

      {calls.isPending ? (
        <p className="text-neutral-500">Loading calls…</p>
      ) : calls.isError ? (
        <p className="text-red-600 dark:text-red-400">{calls.error.message}</p>
      ) : calls.data.length === 0 ? (
        <p className="text-neutral-600 dark:text-neutral-400">
          No calls yet. Placed and received calls appear here as they happen.
        </p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>When</TH>
              <TH>Direction</TH>
              <TH>Party</TH>
              <TH>Trunk</TH>
              <TH>State</TH>
              <TH>Duration</TH>
              <TH>Codec</TH>
              <TH>Recording</TH>
            </TR>
          </THead>
          <TBody>
            {calls.data.map((call) => (
              <TR key={call.id}>
                <TD className="whitespace-nowrap">
                  <Link
                    to="/calls/$callId"
                    params={{ callId: call.id }}
                    className="text-blue-700 hover:underline"
                  >
                    {formatTimestamp(call.started_at)}
                  </Link>
                </TD>
                <TD>{directionLabel(call.direction)}</TD>
                <TD className="font-mono text-xs">{callParty(call)}</TD>
                <TD>{trunkName(call.trunk_id)}</TD>
                <TD>
                  <Badge variant={STATE_VARIANTS[call.state]}>
                    {call.state}
                  </Badge>
                </TD>
                <TD>{durationLabel(callDurationSeconds(call), call.state)}</TD>
                <TD>{codecLabel(call.codec)}</TD>
                <TD>
                  {call.recording === null ? (
                    '—'
                  ) : (
                    <RecordingPlayer callId={call.id} />
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </section>
  );
}
