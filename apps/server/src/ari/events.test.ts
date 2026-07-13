// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import {
  ChannelHangupRequestEventSchema,
  StasisEndEventSchema,
  StasisStartEventSchema,
} from './events';

describe('ARI event schemas', () => {
  it('parses a StasisStart with args and channel dialplan', () => {
    const parsed = StasisStartEventSchema.parse({
      type: 'StasisStart',
      args: ['dialed', 'bridge-1'],
      channel: {
        id: 'c1',
        dialplan: { exten: '1002', context: 'switchboard-trunk' },
        caller: { number: '1001' },
      },
    });
    expect(parsed.args).toEqual(['dialed', 'bridge-1']);
    expect(parsed.channel.dialplan?.exten).toBe('1002');
    expect(parsed.channel.dialplan?.context).toBe('switchboard-trunk');
  });

  it('defaults StasisStart args to an empty array', () => {
    const parsed = StasisStartEventSchema.parse({
      type: 'StasisStart',
      channel: { id: 'c1' },
    });
    expect(parsed.args).toEqual([]);
  });

  it('rejects a malformed event (missing channel id)', () => {
    expect(
      StasisStartEventSchema.safeParse({ type: 'StasisStart', channel: {} })
        .success,
    ).toBe(false);
  });

  it('parses StasisEnd and ChannelHangupRequest', () => {
    expect(
      StasisEndEventSchema.parse({ type: 'StasisEnd', channel: { id: 'c1' } })
        .type,
    ).toBe('StasisEnd');
    const hangup = ChannelHangupRequestEventSchema.parse({
      type: 'ChannelHangupRequest',
      channel: { id: 'c1' },
      cause: 16,
    });
    expect(hangup.cause).toBe(16);
  });
});
