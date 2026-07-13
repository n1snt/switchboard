// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import type { PhoneNumber, Trunk } from '@switchboard/shared';
import { NUMBER_EXAMPLE, TRUNK_EXAMPLE } from '@switchboard/shared';
import { applyDialRewrite, planOutgoing } from './dialing';

describe('applyDialRewrite', () => {
  it('returns the number unchanged with no rules or prefix', () => {
    expect(applyDialRewrite('+14155550123', { rules: [] })).toBe(
      '+14155550123',
    );
  });

  it('ignores an empty technical prefix', () => {
    expect(
      applyDialRewrite('14155550123', { tech_prefix: '', rules: [] }),
    ).toBe('14155550123');
  });

  it('applies rewrite rules in order, then the technical prefix', () => {
    expect(
      applyDialRewrite('+14155550123', {
        tech_prefix: '9011',
        rules: [{ match: '^\\+1', replace: '' }],
      }),
    ).toBe('90114155550123');
  });
});

describe('planOutgoing', () => {
  const trunk: Trunk = { ...TRUNK_EXAMPLE };
  const number: PhoneNumber = { ...NUMBER_EXAMPLE };

  it('dials an ad-hoc SIP URI as-is', () => {
    expect(
      planOutgoing('sip:agent@10.0.0.5', { numbers: [], trunks: [] }),
    ).toEqual({
      endpoint: 'sip:agent@10.0.0.5',
      trunkId: null,
      toNumber: 'sip:agent@10.0.0.5',
    });
  });

  it('routes a saved number through its trunk with the dial rewrite applied', () => {
    const rewriting: Trunk = {
      ...trunk,
      dial_rewrite: {
        tech_prefix: '9011',
        rules: [{ match: '^\\+', replace: '' }],
      },
    };
    expect(
      planOutgoing(number.e164, { numbers: [number], trunks: [rewriting] }),
    ).toEqual({
      endpoint: `PJSIP/901114155550123@${trunk.id}`,
      trunkId: trunk.id,
      toNumber: number.e164,
    });
  });

  it('dials a trunk by name', () => {
    expect(planOutgoing(trunk.name, { numbers: [], trunks: [trunk] })).toEqual({
      endpoint: `PJSIP/${trunk.id}`,
      trunkId: trunk.id,
      toNumber: trunk.name,
    });
  });

  it('falls back to a bare endpoint when a number references a missing trunk', () => {
    expect(
      planOutgoing(number.e164, { numbers: [number], trunks: [] }),
    ).toEqual({
      endpoint: `PJSIP/${number.e164}`,
      trunkId: null,
      toNumber: number.e164,
    });
  });

  it('dials an unmatched string as a bare endpoint (browser-to-browser)', () => {
    expect(planOutgoing('1002', { numbers: [], trunks: [] })).toEqual({
      endpoint: 'PJSIP/1002',
      trunkId: null,
      toNumber: '1002',
    });
  });
});
