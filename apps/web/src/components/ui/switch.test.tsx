// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { Switch } from './switch';

function Controlled(): ReactNode {
  const [on, setOn] = useState(false);
  return <Switch checked={on} onCheckedChange={setOn} aria-label="Record" />;
}

describe('Switch', () => {
  it('toggles checked state on click', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const toggle = screen.getByRole('switch', { name: 'Record' });
    expect(toggle).toHaveAttribute('data-state', 'unchecked');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('data-state', 'checked');
  });
});
