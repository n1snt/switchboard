// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { parseSipTrace } from './sip-trace-parser';

const SAMPLE = `
<--- Received SIP request --->
INVITE sip:1002@switchboard SIP/2.0

<--- Transmitting SIP response --->
SIP/2.0 200 OK

<--- Transmitting SIP response --->
SIP/2.0 486

<--- Received SIP request --->
BYE
`;

describe('parseSipTrace', () => {
  it('parses requests and responses into an ordered ladder', () => {
    const entries = parseSipTrace(SAMPLE, {
      now: () => '2026-07-13T10:00:00.000Z',
    });
    expect(entries.map((e) => `${e.direction}:${e.method}`)).toEqual([
      'incoming:INVITE',
      'outgoing:200',
      'outgoing:486',
      'incoming:BYE',
    ]);
    expect(entries[0]?.summary).toBe('INVITE sip:1002@switchboard SIP/2.0');
    expect(entries[0]?.at).toBe('2026-07-13T10:00:00.000Z');
  });

  it('uses a real clock by default', () => {
    const entries = parseSipTrace(
      '<--- Received SIP request --->\nINVITE sip:x SIP/2.0',
    );
    expect(entries[0]?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('ignores a marker with no following message', () => {
    expect(parseSipTrace('<--- Received SIP request --->\n\n')).toEqual([]);
  });

  it('returns nothing for text with no markers', () => {
    expect(parseSipTrace('just some log noise')).toEqual([]);
  });
});
