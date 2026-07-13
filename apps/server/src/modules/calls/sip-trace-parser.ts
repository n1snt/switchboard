// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { SipTraceEntry } from '@switchboard/shared';

// Feature 23: parse Asterisk's PJSIP logger output into SIP trace entries for the
// call-ladder diagram. Each logged message is framed by a marker line such as
// `<--- Received SIP request ... --->` or `<--- Transmitting SIP response ... --->`
// followed by the raw SIP message whose first line is the method or status.

const RECEIVED = /<---\s*Received\s+SIP/i;
const TRANSMITTING = /<---\s*Transmitting\s+SIP/i;

/** Turn a SIP start line into a short method/status label. */
function labelFor(startLine: string): string {
  const spaceIndex = startLine.indexOf(' ');
  const first = spaceIndex === -1 ? startLine : startLine.slice(0, spaceIndex);
  if (first !== 'SIP/2.0') {
    return first;
  }
  const rest = startLine.slice(spaceIndex + 1).trim();
  const codeIndex = rest.indexOf(' ');
  return codeIndex === -1 ? rest : rest.slice(0, codeIndex);
}

export interface ParseOptions {
  now?: () => string;
}

/** Parse raw PJSIP logger text into ordered SIP trace entries. */
export function parseSipTrace(
  raw: string,
  options: ParseOptions = {},
): SipTraceEntry[] {
  const now = options.now ?? ((): string => new Date().toISOString());
  const entries: SipTraceEntry[] = [];
  let pending: 'incoming' | 'outgoing' | null = null;

  for (const line of raw.split('\n')) {
    if (RECEIVED.test(line)) {
      pending = 'incoming';
      continue;
    }
    if (TRANSMITTING.test(line)) {
      pending = 'outgoing';
      continue;
    }
    if (pending !== null && line.trim().length > 0) {
      const startLine = line.trim();
      entries.push({
        at: now(),
        direction: pending,
        method: labelFor(startLine),
        summary: startLine,
      });
      pending = null;
    }
  }
  return entries;
}
