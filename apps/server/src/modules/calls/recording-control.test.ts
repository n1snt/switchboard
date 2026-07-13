// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import type { Call } from '@switchboard/shared';
import { CALL_EXAMPLE } from '@switchboard/shared';
import {
  LiveRecordingControl,
  noopRecordingControl,
} from './recording-control';

describe('recording control', () => {
  it('noop control never has a live call', async () => {
    expect(await noopRecordingControl.setRecording('c1', true)).toBeNull();
  });

  it('LiveRecordingControl returns null until a coordinator is attached', async () => {
    const control = new LiveRecordingControl();
    expect(await control.setRecording('c1', true)).toBeNull();
  });

  it('LiveRecordingControl delegates to the attached coordinator', async () => {
    const control = new LiveRecordingControl();
    const call: Call = { ...CALL_EXAMPLE, id: 'c1', recording: 'c1.wav' };
    const setRecording = vi.fn().mockResolvedValue(call);
    control.attach({ setRecording });

    expect(await control.setRecording('c1', true)).toBe(call);
    expect(setRecording).toHaveBeenCalledWith('c1', true);
  });
});
