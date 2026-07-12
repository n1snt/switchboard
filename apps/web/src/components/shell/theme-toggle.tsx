// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme';

// The manual light/dark switch in the header. Shows the icon of the theme it
// will switch *to*, and labels itself for assistive tech.

export function ThemeToggle(): ReactNode {
  const { theme, toggle } = useTheme();
  const nextIsDark = theme === 'light';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={nextIsDark ? 'Switch to dark theme' : 'Switch to light theme'}
    >
      {nextIsDark ? (
        <Moon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Sun className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
