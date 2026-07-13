// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, useSoftphoneStore } from '@/stores/softphone';
import { renderAppAt, stubHealth } from '@/test/harness';

// Fault profiles (feature 26) are not built yet; the screen is still an empty
// state. This keeps it covered until that feature lands.

beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
  stubHealth();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('faults screen', () => {
  it('renders the placeholder empty state', async () => {
    renderAppAt('/faults');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fault profiles' }),
    ).toBeInTheDocument();
  });
});
