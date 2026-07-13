// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import type { IncomingCallInfo } from '@/features/softphone/adapter';
import { beforeEach, describe, expect, it } from 'vitest';
import { CallOverlay } from './call-overlay';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';

const first: IncomingCallInfo = { id: 'in-1', from: '+1111', via: 'carrier' };
const second: IncomingCallInfo = { id: 'in-2', from: '+2222', via: 'agent' };

beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
});

describe('CallOverlay', () => {
  it('renders no cards and an empty live region while idle', () => {
    render(<CallOverlay />);
    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(screen.queryByText('Incoming call')).not.toBeInTheDocument();
  });

  it('stacks multiple incoming calls and announces the latest', () => {
    useSoftphoneStore.setState({ incoming: [first, second] });
    render(<CallOverlay />);
    expect(screen.getAllByText('Incoming call')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Incoming call from +2222',
    );
  });
});
