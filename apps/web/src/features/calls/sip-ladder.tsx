// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SipTraceEntry } from '@switchboard/shared';

// The call-ladder diagram, hand-rendered from the captured SIP trace. Two
// columns (the far peer and the engine); each message is an arrow between them,
// its direction taken from the trace entry (incoming = received by the engine,
// so peer to engine). No diagram library, per the project constraints.

export function SipLadder({
  trace,
}: {
  trace: readonly SipTraceEntry[];
}): ReactNode {
  if (trace.length === 0) {
    return (
      <p className="text-sm text-neutral-500">No SIP messages captured.</p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-between text-xs font-medium uppercase tracking-wide text-neutral-500">
        <span>Peer</span>
        <span>Engine</span>
      </div>
      <ol className="flex flex-col gap-1">
        {trace.map((entry, index) => {
          const incoming = entry.direction === 'incoming';
          return (
            <li
              key={`${entry.at}-${String(index)}`}
              className="flex items-center gap-2 rounded border border-neutral-200 px-2 py-1 text-sm dark:border-neutral-800"
            >
              {incoming ? (
                <ArrowRight
                  className="h-4 w-4 text-blue-600"
                  role="img"
                  aria-label="peer to engine"
                />
              ) : (
                <ArrowLeft
                  className="h-4 w-4 text-green-600"
                  role="img"
                  aria-label="engine to peer"
                />
              )}
              <span className="font-mono font-medium">{entry.method}</span>
              <span className="text-neutral-500">{entry.summary}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
