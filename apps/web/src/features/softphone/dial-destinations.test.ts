// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import {
  NUMBER_EXAMPLE,
  TRUNK_EXAMPLE,
  type PhoneNumber,
  type Trunk,
} from '@switchboard/shared';
import { describe, expect, it } from 'vitest';
import { buildDestinations } from './dial-destinations';

const dialable: Trunk = {
  ...TRUNK_EXAMPLE,
  id: 't1',
  name: 'agent-dev',
  direction: 'both',
};
const inbound: Trunk = {
  ...TRUNK_EXAMPLE,
  id: 't2',
  name: 'inbound',
  direction: 'inbound',
};
const outbound: Trunk = {
  ...TRUNK_EXAMPLE,
  id: 't3',
  name: 'outbound',
  direction: 'outbound',
};
const disabled: Trunk = {
  ...TRUNK_EXAMPLE,
  id: 't4',
  name: 'off',
  direction: 'both',
  enabled: false,
};

describe('buildDestinations', () => {
  it('includes enabled inbound-capable trunks only', () => {
    const result = buildDestinations(
      [dialable, inbound, outbound, disabled],
      [],
    );
    expect(result.map((d) => d.value)).toEqual(['agent-dev', 'inbound']);
    expect(result[0]?.group).toBe('Trunks');
  });

  it('labels numbers with and without a label', () => {
    const noLabel: PhoneNumber = {
      id: 'n2',
      e164: '+14155559999',
      trunk_id: 't1',
    };
    const result = buildDestinations([], [NUMBER_EXAMPLE, noLabel]);
    expect(result).toEqual([
      {
        value: '+14155550123',
        label: 'Main line (+14155550123)',
        group: 'Numbers',
      },
      { value: '+14155559999', label: '+14155559999', group: 'Numbers' },
    ]);
  });
});
