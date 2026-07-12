// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSystemTheme, ThemeProvider, useTheme } from './theme';

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      media: '',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
}

function ThemeReadout(): React.ReactNode {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" onClick={toggle}>
      theme is {theme}
    </button>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('data-theme');
});

describe('getSystemTheme', () => {
  it('returns dark when the OS prefers dark', () => {
    stubMatchMedia(true);
    expect(getSystemTheme()).toBe('dark');
  });

  it('returns light when the OS does not prefer dark', () => {
    stubMatchMedia(false);
    expect(getSystemTheme()).toBe('light');
  });
});

describe('ThemeProvider', () => {
  it('applies the system theme to the document root and toggles it', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    );

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(screen.getByRole('button')).toHaveTextContent('theme is light');

    await user.click(screen.getByRole('button'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByRole('button')).toHaveTextContent('theme is dark');

    await user.click(screen.getByRole('button'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

describe('useTheme', () => {
  it('throws when used outside a ThemeProvider', () => {
    stubMatchMedia(false);
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used within a ThemeProvider',
    );
  });
});
