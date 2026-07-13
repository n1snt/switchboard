// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TrunkCreate } from '@switchboard/shared';
import { describe, expect, it, vi } from 'vitest';
import { defaultTrunkForm } from './form-model';
import { TrunkForm } from './trunk-form';

function setup(overrides: Partial<Parameters<typeof TrunkForm>[0]> = {}) {
  const onSubmit = vi.fn<(input: TrunkCreate) => void>();
  const onCancel = vi.fn();
  const utils = render(
    <TrunkForm
      initialValues={defaultTrunkForm()}
      submitLabel="Save trunk"
      submitting={false}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onSubmit, onCancel, ...utils };
}

describe('TrunkForm', () => {
  it('blocks submit and shows field errors when invalid', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.click(screen.getByRole('button', { name: 'Save trunk' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('an inbound-capable trunk requires a target host'),
    ).toBeInTheDocument();
  });

  it('validates a field on blur', async () => {
    setup();
    const name = screen.getByLabelText('Name');
    fireEvent.blur(name);
    expect(
      await screen.findByText(
        'an inbound-capable trunk requires a target host',
      ),
    ).toBeInTheDocument();
  });

  it('submits the converted input for a valid form', async () => {
    const user = userEvent.setup();
    const { onSubmit, container } = setup();

    await user.type(screen.getByLabelText('Name'), 'agent-dev');
    await user.type(screen.getByLabelText('Host or IP address'), 'host');

    // Exercise every control group's change handler.
    fireEvent.change(
      container.querySelector('#direction') as HTMLSelectElement,
      {
        target: { value: 'inbound' },
      },
    );
    fireEvent.change(
      container.querySelector('#transport') as HTMLSelectElement,
      { target: { value: 'tcp' } },
    );
    fireEvent.change(
      container.querySelector('#auth_mode') as HTMLSelectElement,
      { target: { value: 'none' } },
    );
    fireEvent.change(
      container.querySelector('#dtmf_mode') as HTMLSelectElement,
      { target: { value: 'info' } },
    );
    fireEvent.change(
      container.querySelector('#media_encryption') as HTMLSelectElement,
      { target: { value: 'srtp' } },
    );
    await user.click(screen.getByRole('switch', { name: 'Enabled' }));
    // Toggle Register on then off so its handler runs but the form stays valid
    // (registration would otherwise require a registrar).
    await user.click(screen.getByRole('switch', { name: 'Register' }));
    await user.click(screen.getByRole('switch', { name: 'Register' }));
    await user.click(screen.getByRole('checkbox', { name: 'g722' }));

    await user.click(screen.getByRole('button', { name: 'Save trunk' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const input = onSubmit.mock.calls[0]?.[0];
    expect(input?.name).toBe('agent-dev');
    expect(input?.target_host).toBe('host');
    expect(input?.direction).toBe('inbound');
    expect(input?.codecs).toContain('g722');
  });

  it('shows a submit error and calls cancel', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup({ submitError: 'Server said no' });
    expect(screen.getByText('Server said no')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
