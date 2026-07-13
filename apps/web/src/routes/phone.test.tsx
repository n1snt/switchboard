// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';
import { renderAppAt, stubHealth } from '@/test/harness';

vi.mock('@/features/softphone/dialler', () => ({
  Dialler: () => <div>DIALLER</div>,
}));
vi.mock('@/features/softphone/calling-panel', () => ({
  CallingPanel: () => <div>CALLING</div>,
}));
vi.mock('@/features/softphone/in-call', () => ({
  InCall: () => <div>INCALL</div>,
}));

beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
  stubHealth();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('phone screen', () => {
  it('shows the dialler while idle', async () => {
    renderAppAt('/phone');
    expect(await screen.findByText('DIALLER')).toBeInTheDocument();
  });

  it('shows the calling panel while dialling', async () => {
    useSoftphoneStore.setState({ callState: 'calling' });
    renderAppAt('/phone');
    expect(await screen.findByText('CALLING')).toBeInTheDocument();
  });

  it('shows the in-call interface when connected', async () => {
    useSoftphoneStore.setState({ callState: 'in-call' });
    renderAppAt('/phone');
    expect(await screen.findByText('INCALL')).toBeInTheDocument();
  });
});
