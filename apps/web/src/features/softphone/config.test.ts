// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import {
  resolveSoftphoneConfig,
  type SoftphoneEnv,
  type SoftphoneLocation,
} from './config';

function location(
  overrides: Partial<SoftphoneLocation> = {},
): SoftphoneLocation {
  return {
    protocol: 'http:',
    hostname: 'localhost',
    search: '',
    ...overrides,
  };
}

describe('resolveSoftphoneConfig', () => {
  it('defaults to endpoint 1001 on the page host over ws', () => {
    const config = resolveSoftphoneConfig(location(), {});
    expect(config).toEqual({
      server: 'ws://localhost:8088/ws',
      domain: 'localhost',
      extension: '1001',
      aor: 'sip:1001@localhost',
      authorizationUsername: '1001',
      authorizationPassword: 'switchboard1001',
      displayName: 'Switchboard 1001',
    });
  });

  it('uses wss when the page is served over https', () => {
    const config = resolveSoftphoneConfig(
      location({ protocol: 'https:', hostname: 'sw.example' }),
      {},
    );
    expect(config.server).toBe('wss://sw.example:8088/ws');
    expect(config.domain).toBe('sw.example');
  });

  it('picks the endpoint from the ?ext= query param', () => {
    const config = resolveSoftphoneConfig(
      location({ search: '?ext=1002' }),
      {},
    );
    expect(config.extension).toBe('1002');
    expect(config.aor).toBe('sip:1002@localhost');
    expect(config.authorizationUsername).toBe('1002');
    expect(config.authorizationPassword).toBe('switchboard1002');
  });

  it('lets env override the extension and password', () => {
    const env: SoftphoneEnv = {
      VITE_SIP_EXTENSION: '1005',
      VITE_SIP_PASSWORD: 'secret',
    };
    const config = resolveSoftphoneConfig(location(), env);
    expect(config.extension).toBe('1005');
    expect(config.authorizationPassword).toBe('secret');
  });

  it('lets env override the WebSocket URL and derives the domain from it', () => {
    const config = resolveSoftphoneConfig(location(), {
      VITE_SIP_WS_URL: 'wss://engine.internal:9000/ws',
    });
    expect(config.server).toBe('wss://engine.internal:9000/ws');
    expect(config.domain).toBe('engine.internal');
    expect(config.aor).toBe('sip:1001@engine.internal');
  });

  it('prefers the query param over the env extension', () => {
    const config = resolveSoftphoneConfig(location({ search: '?ext=1009' }), {
      VITE_SIP_EXTENSION: '1002',
    });
    expect(config.extension).toBe('1009');
  });
});
