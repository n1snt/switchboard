// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CopyButton } from './copy-button';

describe('CopyButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('copies the value and shows a copied state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // jsdom leaves navigator.clipboard undefined; define it for this test.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<CopyButton value="10.0.0.5:5061" label="Copy address" />);
    const button = screen.getByRole('button', { name: 'Copy address' });
    fireEvent.click(button);

    expect(writeText).toHaveBeenCalledWith('10.0.0.5:5061');
    expect(
      await screen.findByRole('button', { name: 'Copy address (copied)' }),
    ).toBeInTheDocument();
  });
});
