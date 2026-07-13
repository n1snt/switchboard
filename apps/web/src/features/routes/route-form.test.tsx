// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RouteCreate } from '@switchboard/shared';
import { describe, expect, it, vi } from 'vitest';
import { defaultRouteForm } from './form-model';
import { RouteForm } from './route-form';

function setup(overrides: Partial<Parameters<typeof RouteForm>[0]> = {}) {
  const onSubmit = vi.fn<(input: RouteCreate) => void>();
  const onCancel = vi.fn();
  render(
    <RouteForm
      initialValues={defaultRouteForm()}
      submitLabel="Create rule"
      submitting={false}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onSubmit, onCancel };
}

describe('RouteForm', () => {
  it('blocks submit and shows a match error when empty', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.click(screen.getByRole('button', { name: 'Create rule' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getAllByText('String must contain at least 1 character(s)').length,
    ).toBeGreaterThan(0);
  });

  it('submits a valid rule with the chosen direction', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.selectOptions(screen.getByRole('combobox'), 'inbound');
    await user.type(screen.getByLabelText('Match pattern'), '+1*');
    await user.type(screen.getByLabelText('Destination'), 'trunk_1');
    await user.clear(screen.getByLabelText('Priority'));
    await user.type(screen.getByLabelText('Priority'), '5');
    await user.click(screen.getByRole('button', { name: 'Create rule' }));
    expect(onSubmit).toHaveBeenCalledWith({
      direction: 'inbound',
      match: '+1*',
      destination: 'trunk_1',
      priority: 5,
    });
  });

  it('shows a submit error and cancels', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup({ submitError: 'conflict' });
    expect(screen.getByText('conflict')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
