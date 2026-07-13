// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  TRUNK_EXAMPLE,
  type PhoneNumberCreate,
  type Trunk,
} from '@switchboard/shared';
import { describe, expect, it, vi } from 'vitest';
import { defaultNumberForm } from './form-model';
import { inboundTrunks, NumberForm } from './number-form';

const inbound: Trunk = {
  ...TRUNK_EXAMPLE,
  id: 't_in',
  name: 'inbound-trunk',
  direction: 'inbound',
};
const both: Trunk = {
  ...TRUNK_EXAMPLE,
  id: 't_both',
  name: 'both-trunk',
  direction: 'both',
};
const outbound: Trunk = {
  ...TRUNK_EXAMPLE,
  id: 't_out',
  name: 'outbound-trunk',
  direction: 'outbound',
};

describe('inboundTrunks', () => {
  it('keeps inbound and both, drops outbound-only', () => {
    expect(inboundTrunks([inbound, both, outbound])).toEqual([inbound, both]);
  });
});

function setup(overrides: Partial<Parameters<typeof NumberForm>[0]> = {}) {
  const onSubmit = vi.fn<(input: PhoneNumberCreate) => void>();
  const onCancel = vi.fn();
  render(
    <NumberForm
      trunks={[inbound, both, outbound]}
      initialValues={defaultNumberForm()}
      submitLabel="Save number"
      submitting={false}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onSubmit, onCancel };
}

describe('NumberForm', () => {
  it('lists only inbound-capable trunks in the picker', () => {
    setup();
    expect(
      screen.getByRole('option', { name: 'inbound-trunk' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'outbound-trunk' }),
    ).not.toBeInTheDocument();
  });

  it('blocks submit and shows errors when invalid', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.click(screen.getByRole('button', { name: 'Save number' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Must be E.164, e.g. +14155550123'),
    ).toBeInTheDocument();
  });

  it('submits a valid number', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.type(
      screen.getByLabelText('Phone number (E.164)'),
      '+14155550123',
    );
    await user.selectOptions(screen.getByLabelText('Inbound trunk'), 't_in');
    await user.type(screen.getByLabelText('Label (optional)'), 'Main');
    await user.click(screen.getByRole('button', { name: 'Save number' }));
    expect(onSubmit).toHaveBeenCalledWith({
      e164: '+14155550123',
      trunk_id: 't_in',
      label: 'Main',
    });
  });

  it('shows a submit error and cancels', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup({ submitError: 'duplicate' });
    expect(screen.getByText('duplicate')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
