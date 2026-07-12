// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import {
  TRUNK_EXAMPLE,
  TrunkCreateSchema,
  TrunkSchema,
  TrunkUpdateSchema,
} from './trunk';
import type { TrunkCreate } from './trunk';

const base: TrunkCreate = { name: 't', direction: 'outbound' };

describe('TrunkCreateSchema defaults', () => {
  it('fills in provider-parity defaults for the Quick-add path', () => {
    const parsed = TrunkCreateSchema.parse(base);
    expect(parsed.auth_mode).toBe('none');
    expect(parsed.enabled).toBe(true);
    expect(parsed.transport).toBe('udp');
    expect(parsed.target_port).toBe(5060);
    expect(parsed.codecs).toEqual(['ulaw', 'alaw']);
    expect(parsed.dtmf_mode).toBe('rfc2833');
    expect(parsed.max_cps).toBeNull();
    expect(parsed.dial_rewrite).toEqual({ rules: [] });
  });
});

describe('TrunkCreateSchema cross-field rules', () => {
  const cases: Array<{
    name: string;
    input: TrunkCreate;
    ok: boolean;
    path?: string;
  }> = [
    { name: 'valid outbound with auth none', input: base, ok: true },
    {
      name: 'digest without any credentials',
      input: { ...base, auth_mode: 'digest' },
      ok: false,
      path: 'username',
    },
    {
      name: 'digest with username but no password',
      input: { ...base, auth_mode: 'digest', username: 'u' },
      ok: false,
      path: 'username',
    },
    {
      name: 'digest with both credentials',
      input: { ...base, auth_mode: 'digest', username: 'u', password: 'p' },
      ok: true,
    },
    {
      name: 'ip mode with no allowed addresses',
      input: { ...base, auth_mode: 'ip' },
      ok: false,
      path: 'allowed_ips',
    },
    {
      name: 'ip mode with an allowed address',
      input: { ...base, auth_mode: 'ip', allowed_ips: ['10.0.0.5'] },
      ok: true,
    },
    {
      name: 'register without a registrar',
      input: { ...base, register: true },
      ok: false,
      path: 'registrar',
    },
    {
      name: 'register with a registrar',
      input: { ...base, register: true, registrar: 'sip:reg.example' },
      ok: true,
    },
    {
      name: 'inbound without a target host',
      input: { name: 't', direction: 'inbound' },
      ok: false,
      path: 'target_host',
    },
    {
      name: 'inbound with a target host',
      input: {
        name: 't',
        direction: 'inbound',
        target_host: 'host.docker.internal',
      },
      ok: true,
    },
    {
      name: 'both without a target host',
      input: { name: 't', direction: 'both' },
      ok: false,
      path: 'target_host',
    },
  ];

  it.each(cases)('$name -> ok=$ok', ({ input, ok, path }) => {
    const result = TrunkCreateSchema.safeParse(input);
    expect(result.success).toBe(ok);
    if (!result.success && path) {
      expect(
        result.error.issues.some((issue) => issue.path.includes(path)),
      ).toBe(true);
    }
  });
});

describe('TrunkSchema and TrunkUpdateSchema', () => {
  it('accepts a full stored trunk (the example)', () => {
    expect(TrunkSchema.parse(TRUNK_EXAMPLE)).toEqual(TRUNK_EXAMPLE);
  });

  it('rejects an unknown direction', () => {
    expect(
      TrunkSchema.safeParse({ ...TRUNK_EXAMPLE, direction: 'sideways' })
        .success,
    ).toBe(false);
  });

  it('lets a partial update omit every field', () => {
    expect(TrunkUpdateSchema.parse({})).toEqual({});
    expect(TrunkUpdateSchema.parse({ name: 'renamed' })).toEqual({
      name: 'renamed',
    });
  });
});
