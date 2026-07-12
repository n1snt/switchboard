// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, buttonVariants } from './button';

describe('Button', () => {
  it('renders a real button by default and merges class names', () => {
    render(<Button className="custom">Call</Button>);
    const button = screen.getByRole('button', { name: 'Call' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveClass('custom');
  });

  it('renders as its child element when asChild is set', () => {
    render(
      <Button asChild variant="danger">
        <a href="/end">End</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'End' });
    expect(link).toHaveAttribute('href', '/end');
  });

  it('exposes cva variants', () => {
    expect(buttonVariants({ variant: 'ghost', size: 'icon' })).toContain(
      'bg-transparent',
    );
  });
});
