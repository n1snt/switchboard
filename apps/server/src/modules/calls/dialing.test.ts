// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import type { PhoneNumber, Trunk } from '@switchboard/shared';
import { NUMBER_EXAMPLE, TRUNK_EXAMPLE } from '@switchboard/shared';
import { applyDialRewrite, resolveDialTarget } from './dialing';

describe('applyDialRewrite', () => {
  it('returns the input unchanged with no rules or prefix', () => {
    expect(applyDialRewrite('+14155550123', { rules: [] })).toBe(
      '+14155550123',
    );
  });

  it('applies rewrite rules', () => {
    expect(
      applyDialRewrite('+14155550123', {
        rules: [{ match: '^\\+1', replace: '1' }],
      }),
    ).toBe('14155550123');
  });

  it('prepends the technical prefix', () => {
    expect(
      applyDialRewrite('14155550123', { tech_prefix: '9011', rules: [] }),
    ).toBe('901114155550123');
  });
});

describe('resolveDialTarget', () => {
  const trunk: Trunk = { ...TRUNK_EXAMPLE, id: 't1', name: 'agent-dev' };
  const number: PhoneNumber = {
    ...NUMBER_EXAMPLE,
    e164: '+14155550123',
    trunk_id: 't1',
  };

  it('resolves an ad-hoc SIP URI', () => {
    expect(
      resolveDialTarget('sip:agent@10.0.0.5', { numbers: [], trunks: [] }),
    ).toEqual({
      kind: 'uri',
      endpoint: 'sip:agent@10.0.0.5',
    });
  });

  it('resolves a saved number to its trunk', () => {
    expect(
      resolveDialTarget('+14155550123', { numbers: [number], trunks: [trunk] }),
    ).toEqual({
      kind: 'number',
      endpoint: 'PJSIP/t1',
      trunkId: 't1',
    });
  });

  it('resolves a trunk by name', () => {
    expect(
      resolveDialTarget('agent-dev', { numbers: [], trunks: [trunk] }),
    ).toEqual({
      kind: 'trunk',
      endpoint: 'PJSIP/t1',
      trunkId: 't1',
    });
  });

  it('returns undefined when a number references a missing trunk', () => {
    expect(
      resolveDialTarget('+14155550123', { numbers: [number], trunks: [] }),
    ).toBeUndefined();
  });

  it('returns undefined when nothing matches', () => {
    expect(
      resolveDialTarget('unknown', { numbers: [], trunks: [] }),
    ).toBeUndefined();
  });
});
