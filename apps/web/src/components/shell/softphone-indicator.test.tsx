// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createInitialState,
  useSoftphoneStore,
  type RegistrationStatus,
} from '@/stores/softphone';
import { SoftphoneIndicator } from './softphone-indicator';

beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
});

describe('SoftphoneIndicator', () => {
  it.each<[RegistrationStatus, string]>([
    ['registered', 'phone ready'],
    ['registering', 'registering'],
    ['unregistered', 'phone offline'],
    ['failed', 'phone error'],
  ])('shows %s as "%s"', (status, label) => {
    useSoftphoneStore.setState({ registration: status });
    render(<SoftphoneIndicator />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
