// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders the heading, message, and a disabled primary action', () => {
    render(
      <EmptyState
        title="Trunks"
        message="No trunks yet."
        actionLabel="New trunk"
      />,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Trunks' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No trunks yet.')).toBeInTheDocument();
    const action = screen.getByRole('button', { name: 'New trunk' });
    expect(action).toBeDisabled();
  });

  it('omits the action when no label is given', () => {
    render(<EmptyState title="Call log" message="No calls yet." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
