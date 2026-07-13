// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import { TRUNK_EXAMPLE, type Trunk } from '@switchboard/shared';
import { describe, expect, it } from 'vitest';
import { TrunkCredentials } from './trunk-credentials';

describe('TrunkCredentials', () => {
  it('shows the address and auth without credentials for a none-auth trunk', () => {
    render(<TrunkCredentials trunk={TRUNK_EXAMPLE} />);
    expect(screen.getByText('host.docker.internal:5060')).toBeInTheDocument();
    expect(screen.getByText('none')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Copy Username' }),
    ).not.toBeInTheDocument();
  });

  it('shows copyable username and password when present', () => {
    const trunk: Trunk = {
      ...TRUNK_EXAMPLE,
      auth_mode: 'digest',
      username: 'sw',
      password: 'secret',
    };
    render(<TrunkCredentials trunk={trunk} />);
    expect(screen.getByText('sw')).toBeInTheDocument();
    expect(screen.getByText('secret')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy Username' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy Password' }),
    ).toBeInTheDocument();
  });
});
