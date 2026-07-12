// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, badgeVariants } from './badge';

describe('Badge', () => {
  it('renders its content', () => {
    render(<Badge>env</Badge>);
    expect(screen.getByText('env')).toBeInTheDocument();
  });

  it('applies the semantic variant class', () => {
    render(<Badge variant="success">ok</Badge>);
    expect(screen.getByText('ok')).toHaveClass('text-green-700');
  });

  it('exposes cva variants', () => {
    expect(badgeVariants({ variant: 'danger' })).toContain('text-red-700');
  });
});
