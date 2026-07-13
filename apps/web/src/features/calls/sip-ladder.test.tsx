// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import type { SipTraceEntry } from '@switchboard/shared';
import { describe, expect, it } from 'vitest';
import { SipLadder } from './sip-ladder';

const trace: SipTraceEntry[] = [
  {
    at: '2026-07-13T10:02:00.000Z',
    direction: 'incoming',
    method: 'INVITE',
    summary: 'from +1415',
  },
  {
    at: '2026-07-13T10:02:00.100Z',
    direction: 'outgoing',
    method: '200',
    summary: 'OK',
  },
];

describe('SipLadder', () => {
  it('renders an empty message when there is no trace', () => {
    render(<SipLadder trace={[]} />);
    expect(screen.getByText('No SIP messages captured.')).toBeInTheDocument();
  });

  it('renders each message with a direction arrow', () => {
    render(<SipLadder trace={trace} />);
    expect(screen.getByText('INVITE')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'peer to engine' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'engine to peer' }),
    ).toBeInTheDocument();
  });
});
