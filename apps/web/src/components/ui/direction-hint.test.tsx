// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DIRECTION_HINTS, DirectionHint } from './direction-hint';

describe('DirectionHint', () => {
  it('renders the explainer for each direction as an accessible label', () => {
    for (const direction of ['inbound', 'outbound', 'both'] as const) {
      const { unmount } = render(<DirectionHint direction={direction} />);
      expect(
        screen.getByRole('img', { name: DIRECTION_HINTS[direction] }),
      ).toBeInTheDocument();
      unmount();
    }
  });
});
