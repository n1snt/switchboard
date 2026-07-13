// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { useCall } from '@/features/calls/hooks';
import { RecordingPlayer } from '@/features/calls/recording-player';
import { SipLadder } from '@/features/calls/sip-ladder';
import { buildTimeline } from '@/features/calls/timeline';
import { callParty, codecLabel, directionLabel } from '@/lib/format';

export const Route = createFileRoute('/calls/$callId')({
  component: CallDetail,
});

function CallDetail(): ReactNode {
  const { callId } = Route.useParams();
  const call = useCall(callId);

  if (call.isPending) {
    return <p className="text-neutral-500">Loading call…</p>;
  }
  if (call.isError) {
    return (
      <p className="text-red-600 dark:text-red-400">{call.error.message}</p>
    );
  }

  const data = call.data;
  const timeline = buildTimeline(data);

  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <Link
        to="/calls"
        className="flex items-center gap-1 text-sm text-blue-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to call log
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {directionLabel(data.direction)}
        </h1>
        <span className="font-mono">{callParty(data)}</span>
        <Badge variant="neutral">{data.state}</Badge>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-neutral-500">Negotiated codec</dt>
        <dd>{codecLabel(data.codec)}</dd>
        <dt className="text-neutral-500">Hangup cause</dt>
        <dd>{data.hangup_cause ?? '—'}</dd>
      </dl>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          State timeline
        </h2>
        <ol className="flex flex-col gap-1 text-sm">
          {timeline.map((entry) => (
            <li key={entry.label} className="flex gap-3">
              <span className="w-20 font-medium">{entry.label}</span>
              <span className="text-neutral-500">{entry.offset}s</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          SIP ladder
        </h2>
        <SipLadder trace={data.sip_trace} />
      </div>

      {data.recording === null ? null : (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Recording
          </h2>
          <RecordingPlayer callId={data.id} />
        </div>
      )}
    </section>
  );
}
