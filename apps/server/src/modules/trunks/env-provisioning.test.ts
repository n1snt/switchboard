// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../testing/harness';
import { applyEnvTrunks } from './env-provisioning';

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

let harness: TestApp;

beforeEach(async () => {
  vi.clearAllMocks();
  harness = await createTestApp();
});

afterEach(async () => {
  await harness.close();
});

describe('applyEnvTrunks', () => {
  it('applies nothing for an empty array', async () => {
    expect(await applyEnvTrunks('[]', harness.services.trunks, logger)).toBe(0);
  });

  it('provisions a fully-specified server as an env trunk', async () => {
    const raw = JSON.stringify([
      {
        name: 'carrier',
        host: '10.0.0.5',
        port: 5061,
        transport: 'tls',
        authMode: 'digest',
        username: 'sw',
        password: 'secret',
        techPrefix: '9011',
        codecs: ['ulaw', 'g722'],
        direction: 'both',
      },
    ]);
    expect(await applyEnvTrunks(raw, harness.services.trunks, logger)).toBe(1);
    const trunks = await harness.services.trunks.list();
    expect(trunks[0]?.source).toBe('env');
    expect(trunks[0]?.transport).toBe('tls');
    expect(trunks[0]?.dial_rewrite.tech_prefix).toBe('9011');
  });

  it('provisions a minimal server with defaults', async () => {
    const raw = JSON.stringify([
      { name: 'agent-dev', host: 'host.docker.internal' },
    ]);
    await applyEnvTrunks(raw, harness.services.trunks, logger);
    const trunks = await harness.services.trunks.list();
    expect(trunks[0]?.auth_mode).toBe('none');
    expect(trunks[0]?.target_port).toBe(5060);
  });

  it('re-applies by name, updating in place across restarts', async () => {
    await applyEnvTrunks(
      JSON.stringify([{ name: 'x', host: 'a' }]),
      harness.services.trunks,
      logger,
    );
    await applyEnvTrunks(
      JSON.stringify([{ name: 'x', host: 'b' }]),
      harness.services.trunks,
      logger,
    );
    const trunks = await harness.services.trunks.list();
    expect(trunks).toHaveLength(1);
    expect(trunks[0]?.target_host).toBe('b');
  });

  it('throws on malformed JSON', async () => {
    await expect(
      applyEnvTrunks('not json', harness.services.trunks, logger),
    ).rejects.toThrow(/not valid JSON/);
  });

  it('throws on a schema-invalid entry', async () => {
    await expect(
      applyEnvTrunks(
        JSON.stringify([{ name: 'x' }]),
        harness.services.trunks,
        logger,
      ),
    ).rejects.toThrow(/invalid/);
  });
});
