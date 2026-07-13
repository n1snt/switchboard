// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { EngineStatus } from '@switchboard/shared';
import { buildApp } from '../app';
import { loadConfig } from '../config';
import { createDb, type Db } from '../db';
import { migrate } from '../db/migrate';
import { EventBus } from '../events/bus';
import type { ApiServices } from '../http/router';
import type { TrunkProvisioner } from '../modules/trunks/provisioner';

// A ready-to-use control plane over a throwaway SQLite file, shared by the HTTP
// route tests. Straight-line by design so it needs no coverage carve-out.

export interface TestApp {
  app: FastifyInstance;
  db: Db;
  bus: EventBus;
  services: ApiServices;
  recordingsDir: string;
  close: () => Promise<void>;
}

export interface TestAppOptions {
  provisioner?: TrunkProvisioner;
  getEngineStatus?: () => EngineStatus;
}

export async function createTestApp(
  options: TestAppOptions = {},
): Promise<TestApp> {
  const dir = mkdtempSync(join(tmpdir(), 'sb-test-'));
  const db = createDb(join(dir, 'test.sqlite'));
  await migrate(db);
  const bus = new EventBus();
  const recordingsDir = join(dir, 'recordings');
  mkdirSync(recordingsDir, { recursive: true });
  const config = { ...loadConfig({}), recordingsDir };
  const { app, services } = await buildApp({
    config,
    db,
    bus,
    ...(options.provisioner ? { provisioner: options.provisioner } : {}),
    ...(options.getEngineStatus
      ? { getEngineStatus: options.getEngineStatus }
      : {}),
  });
  await app.ready();

  const close = async (): Promise<void> => {
    await app.close();
    await db.destroy();
    rmSync(dir, { recursive: true, force: true });
  };
  return { app, db, bus, services, recordingsDir, close };
}
