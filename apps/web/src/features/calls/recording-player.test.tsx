// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecordingPlayer } from './recording-player';

describe('RecordingPlayer', () => {
  it('plays and downloads from the recording endpoint', () => {
    render(<RecordingPlayer callId="call_1" />);
    expect(screen.getByLabelText('Call recording')).toHaveAttribute(
      'src',
      '/api/v1/calls/call_1/recording',
    );
    expect(
      screen.getByRole('link', { name: 'Download recording' }),
    ).toHaveAttribute('href', '/api/v1/calls/call_1/recording');
  });
});
