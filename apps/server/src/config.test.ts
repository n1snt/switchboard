// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('applies defaults with an empty environment', () => {
    const config = loadConfig({});
    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(3000);
    expect(config.recordAll).toBe(false);
    expect(config.corsOrigin).toBe(false);
    expect(config.ari.app).toBe('switchboard');
    expect(config.sipServers).toBe('[]');
    expect(config.databasePath).toContain('switchboard.sqlite');
    expect(config.pjsipTraceFile).toBeUndefined();
  });

  it('reads and coerces provided values', () => {
    const config = loadConfig({
      SWITCHBOARD_HOST: '0.0.0.0',
      SWITCHBOARD_PORT: '8080',
      SWITCHBOARD_RECORD_ALL: 'true',
      SWITCHBOARD_CORS_ORIGIN: 'http://localhost:5173',
      SWITCHBOARD_ARI_URL: 'http://engine:8088',
      SWITCHBOARD_PJSIP_TRACE_FILE: '/var/log/asterisk/messages',
    });
    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(8080);
    expect(config.recordAll).toBe(true);
    expect(config.corsOrigin).toBe('http://localhost:5173');
    expect(config.ari.url).toBe('http://engine:8088');
    expect(config.pjsipTraceFile).toBe('/var/log/asterisk/messages');
  });

  it('treats record-all values other than true/1 as false', () => {
    expect(loadConfig({ SWITCHBOARD_RECORD_ALL: '1' }).recordAll).toBe(true);
    expect(loadConfig({ SWITCHBOARD_RECORD_ALL: 'false' }).recordAll).toBe(
      false,
    );
  });

  it('throws a readable error on invalid config', () => {
    expect(() => loadConfig({ SWITCHBOARD_PORT: '70000' })).toThrow(
      /Invalid configuration/,
    );
    expect(() => loadConfig({ SWITCHBOARD_ARI_URL: 'not-a-url' })).toThrow(
      /Invalid configuration/,
    );
  });
});
