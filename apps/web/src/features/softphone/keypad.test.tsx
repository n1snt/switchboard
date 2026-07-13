// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KEYPAD_KEYS, Keypad } from './keypad';

describe('Keypad', () => {
  it('renders all twelve keys and reports presses', async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();
    render(<Keypad onPress={onPress} />);
    expect(KEYPAD_KEYS).toHaveLength(12);
    await user.click(screen.getByRole('button', { name: 'Key 5' }));
    await user.click(screen.getByRole('button', { name: 'Key #' }));
    expect(onPress).toHaveBeenNthCalledWith(1, '5');
    expect(onPress).toHaveBeenNthCalledWith(2, '#');
  });
});
