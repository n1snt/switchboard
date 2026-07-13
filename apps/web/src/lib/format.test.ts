// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { CALL_EXAMPLE, type Call } from '@switchboard/shared';
import { describe, expect, it } from 'vitest';
import {
  callDurationSeconds,
  callParty,
  codecLabel,
  directionLabel,
  formatDuration,
  formatTimestamp,
  trunkAddress,
} from './format';

describe('directionLabel', () => {
  it('maps inbound to Placed and outbound to Received', () => {
    expect(directionLabel('inbound')).toBe('Placed');
    expect(directionLabel('outbound')).toBe('Received');
  });
});

describe('codecLabel', () => {
  it('labels known codecs', () => {
    expect(codecLabel('ulaw')).toBe('PCMU');
    expect(codecLabel('alaw')).toBe('PCMA');
    expect(codecLabel('opus')).toBe('Opus');
  });

  it('passes an unknown codec through', () => {
    expect(codecLabel('speex')).toBe('speex');
  });

  it('shows a dash for a null codec', () => {
    expect(codecLabel(null)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('formats sub-hour durations as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(75)).toBe('1:15');
  });

  it('formats hour-plus durations as h:mm:ss', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('clamps negative and fractional input', () => {
    expect(formatDuration(-5)).toBe('0:00');
    expect(formatDuration(42.9)).toBe('0:42');
  });
});

describe('callDurationSeconds', () => {
  it('computes talk time for an answered, ended call', () => {
    expect(callDurationSeconds(CALL_EXAMPLE)).toBe(42);
  });

  it('is null when never answered', () => {
    const call: Call = { ...CALL_EXAMPLE, answered_at: null };
    expect(callDurationSeconds(call)).toBeNull();
  });

  it('is null while still live', () => {
    const call: Call = { ...CALL_EXAMPLE, ended_at: null };
    expect(callDurationSeconds(call)).toBeNull();
  });
});

describe('formatTimestamp', () => {
  it('formats an ISO timestamp in UTC', () => {
    expect(formatTimestamp('2026-07-13T10:02:00.000Z')).toBe(
      '2026-07-13 10:02:00',
    );
  });
});

describe('callParty', () => {
  it('is the called party for a placed (inbound) call', () => {
    expect(
      callParty({ direction: 'inbound', from_number: 'a', to_number: 'b' }),
    ).toBe('b');
  });

  it('is the caller for a received (outbound) call', () => {
    expect(
      callParty({ direction: 'outbound', from_number: 'a', to_number: 'b' }),
    ).toBe('a');
  });
});

describe('trunkAddress', () => {
  it('joins host and port', () => {
    expect(trunkAddress({ target_host: '10.0.0.5', target_port: 5061 })).toBe(
      '10.0.0.5:5061',
    );
  });

  it('shows a dash when there is no host', () => {
    expect(trunkAddress({ target_port: 5060 })).toBe('—');
    expect(trunkAddress({ target_host: '', target_port: 5060 })).toBe('—');
  });
});
