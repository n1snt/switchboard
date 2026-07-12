// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '@/lib/theme';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  it('flips the theme label and document attribute when clicked', async () => {
    // The default matchMedia stub (vitest.setup) reports the light preference.
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggle = screen.getByRole('button', { name: 'Switch to dark theme' });
    await user.click(toggle);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(
      screen.getByRole('button', { name: 'Switch to light theme' }),
    ).toBeInTheDocument();
  });
});
