// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { TRUNK_EXAMPLE, type Trunk } from '@switchboard/shared';
import { describe, expect, it } from 'vitest';
import {
  CODEC_ORDER,
  defaultTrunkForm,
  formToTrunkInput,
  parseAddress,
  toggleCodec,
  trunkToForm,
  validateTrunkForm,
  type TrunkFormValues,
} from './form-model';

function validForm(overrides: Partial<TrunkFormValues> = {}): TrunkFormValues {
  return {
    ...defaultTrunkForm(),
    name: 'agent-dev',
    target_host: 'host',
    ...overrides,
  };
}

describe('defaultTrunkForm', () => {
  it('matches the Quick-add defaults', () => {
    const form = defaultTrunkForm();
    expect(form.direction).toBe('both');
    expect(form.enabled).toBe(true);
    expect(form.auth_mode).toBe('none');
    expect(form.target_port).toBe('5060');
    expect(form.codecs).toEqual(['ulaw', 'alaw']);
  });
});

describe('CODEC_ORDER', () => {
  it('lists codecs in preference order', () => {
    expect(CODEC_ORDER).toEqual(['ulaw', 'alaw', 'g722', 'opus', 'g729']);
  });
});

describe('toggleCodec', () => {
  it('adds a codec in canonical order', () => {
    expect(toggleCodec(['alaw'], 'ulaw')).toEqual(['ulaw', 'alaw']);
  });

  it('removes an already-selected codec', () => {
    expect(toggleCodec(['ulaw', 'alaw'], 'ulaw')).toEqual(['alaw']);
  });
});

describe('parseAddress', () => {
  it('splits host and port', () => {
    expect(parseAddress('10.0.0.5:5061')).toEqual({
      host: '10.0.0.5',
      port: '5061',
    });
  });

  it('defaults the port for a bare host', () => {
    expect(parseAddress('host.docker.internal')).toEqual({
      host: 'host.docker.internal',
      port: '5060',
    });
  });

  it('keeps a SIP URI whole when the trailing segment is not numeric', () => {
    expect(parseAddress('sip:agent@host')).toEqual({
      host: 'sip:agent@host',
      port: '5060',
    });
  });
});

describe('trunkToForm', () => {
  it('fills the form from the example trunk', () => {
    const form = trunkToForm(TRUNK_EXAMPLE);
    expect(form.name).toBe('agent-dev');
    expect(form.target_host).toBe('host.docker.internal');
    expect(form.target_port).toBe('5060');
    expect(form.username).toBe('');
    expect(form.register_expiry).toBe('');
    expect(form.max_cps).toBe('');
  });

  it('blanks the host for a trunk with no target host', () => {
    const { target_host: _drop, ...rest } = TRUNK_EXAMPLE;
    expect(trunkToForm(rest).target_host).toBe('');
  });

  it('fills every optional field from a fully-populated trunk', () => {
    const trunk: Trunk = {
      ...TRUNK_EXAMPLE,
      auth_mode: 'digest',
      username: 'sw',
      password: 'secret',
      auth_username: 'sw-auth',
      realm: 'carrier',
      allowed_ips: ['10.0.0.1', '10.0.0.2'],
      register: true,
      registrar: 'sip:registrar',
      register_expiry: 3600,
      outbound_proxy: 'sip:proxy',
      dial_rewrite: { tech_prefix: '9011', rules: [] },
      caller_id_name: 'Dev',
      caller_id_number: '+14155550000',
      max_cps: 10,
      max_channels: 20,
    };
    const form = trunkToForm(trunk);
    expect(form.username).toBe('sw');
    expect(form.auth_username).toBe('sw-auth');
    expect(form.realm).toBe('carrier');
    expect(form.allowed_ips).toBe('10.0.0.1, 10.0.0.2');
    expect(form.registrar).toBe('sip:registrar');
    expect(form.register_expiry).toBe('3600');
    expect(form.outbound_proxy).toBe('sip:proxy');
    expect(form.tech_prefix).toBe('9011');
    expect(form.caller_id_name).toBe('Dev');
    expect(form.caller_id_number).toBe('+14155550000');
    expect(form.max_cps).toBe('10');
    expect(form.max_channels).toBe('20');
  });
});

describe('formToTrunkInput', () => {
  it('omits blank optionals and defaults the port', () => {
    const input = formToTrunkInput(defaultTrunkForm());
    expect(input.target_port).toBe(5060);
    expect(input).not.toHaveProperty('username');
    expect(input).not.toHaveProperty('target_host');
    expect(input.dial_rewrite).toEqual({ rules: [] });
    expect(input.max_cps).toBeNull();
  });

  it('includes populated optionals and parses lists and numbers', () => {
    const input = formToTrunkInput(
      validForm({
        username: 'sw',
        password: 'secret',
        auth_username: 'sw-auth',
        realm: 'carrier',
        allowed_ips: '10.0.0.1, 10.0.0.2 ,',
        registrar: 'sip:r',
        register_expiry: '3600',
        target_port: '5061',
        outbound_proxy: 'sip:p',
        tech_prefix: '9011',
        caller_id_name: 'Dev',
        caller_id_number: '+1',
        max_cps: '10',
        max_channels: '20',
      }),
    );
    expect(input.username).toBe('sw');
    expect(input.allowed_ips).toEqual(['10.0.0.1', '10.0.0.2']);
    expect(input.register_expiry).toBe(3600);
    expect(input.target_port).toBe(5061);
    expect(input.dial_rewrite).toEqual({ rules: [], tech_prefix: '9011' });
    expect(input.max_cps).toBe(10);
    expect(input.max_channels).toBe(20);
    expect(input.caller_id_number).toBe('+1');
  });

  it('treats a non-numeric port as the default', () => {
    const input = formToTrunkInput(validForm({ target_port: 'abc' }));
    expect(input.target_port).toBe(5060);
  });
});

describe('validateTrunkForm', () => {
  it('passes a complete trunk', () => {
    expect(validateTrunkForm(validForm())).toEqual({});
  });

  it('flags a missing name', () => {
    expect(validateTrunkForm(validForm({ name: '' }))).toHaveProperty('name');
  });

  it('requires digest credentials', () => {
    expect(
      validateTrunkForm(validForm({ auth_mode: 'digest' })),
    ).toHaveProperty('username');
  });

  it('requires an allowed IP in ip mode', () => {
    expect(
      validateTrunkForm(validForm({ auth_mode: 'ip', allowed_ips: '' })),
    ).toHaveProperty('allowed_ips');
  });

  it('requires a registrar when registering', () => {
    expect(
      validateTrunkForm(validForm({ register: true, registrar: '' })),
    ).toHaveProperty('registrar');
  });

  it('requires a target host for an inbound-capable trunk', () => {
    expect(
      validateTrunkForm(validForm({ direction: 'both', target_host: '' })),
    ).toHaveProperty('target_host');
  });

  it('keeps only the first message when a field raises several issues', () => {
    const errors = validateTrunkForm(validForm({ register_expiry: '-1.5' }));
    expect(errors.register_expiry).toBeDefined();
  });
});
