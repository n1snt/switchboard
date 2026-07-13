// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

/* v8 ignore file -- entrypoint/composition root: exercised by running the
   server (docker compose up), not by unit tests. Its parts (config, app,
   migrate, db, ARI wiring) are each unit-tested. */

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadConfig } from './config';
import { createDb } from './db';
import { migrate } from './db/migrate';
import { buildApp } from './app';
import { EventBus } from './events/bus';
import { createAri, realConnector } from './ari';
import { createRealtimeProvisioner } from './modules/trunks/realtime-provisioner';
import { applyEnvTrunks } from './modules/trunks/env-provisioning';
import { CallRepo } from './modules/calls/calls.repo';
import { CallWriter } from './modules/calls/call-writer';
import type { Logger } from './logger';

async function main(): Promise<void> {
  const config = loadConfig();

  // better-sqlite3 does not create parent directories; ensure they exist.
  mkdirSync(dirname(config.databasePath), { recursive: true });
  mkdirSync(config.recordingsDir, { recursive: true });

  const db = createDb(config.databasePath);
  await migrate(db);

  const bus = new EventBus();

  // Bridge Fastify's structured logger to the minimal Logger interface.
  const buildLogger = (log: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  }): Logger => ({
    info: (msg) => log.info(msg),
    warn: (msg) => log.warn(msg),
    error: (msg) => log.error(msg),
  });

  const { app, services } = await buildApp({
    config,
    db,
    bus,
    provisioner: createRealtimeProvisioner(db),
    logger: { level: 'info' },
    getEngineStatus: () => ari.getStatus(),
  });

  const logger = buildLogger(app.log);

  // Persist every call from the event bus (feature 21).
  new CallWriter(new CallRepo(db), logger).subscribe(bus);

  // Seed the record-all setting from the environment when it is explicitly set
  // (feature 25); the environment wins on boot, otherwise the stored value stays.
  await services.settings.seedRecordAll(
    process.env.SWITCHBOARD_RECORD_ALL !== undefined
      ? config.recordAll
      : undefined,
  );

  // Provision environment-managed trunks (feature 13). A bad value is logged, not
  // fatal, so the rest of the control plane still starts.
  try {
    await applyEnvTrunks(config.sipServers, services.trunks, logger);
  } catch (err) {
    logger.error(`env: ${String(err)}`);
  }

  const ari = createAri({
    connect: realConnector(config.ari),
    appName: config.ari.app,
    bus,
    logger,
  });
  void ari.start();

  const close = async (): Promise<void> => {
    ari.stop();
    await app.close();
    await db.destroy();
  };
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void close().finally(() => process.exit(0));
    });
  }

  await app.listen({ host: config.host, port: config.port });
  app.log.info(
    `Switchboard API listening on http://${config.host}:${config.port}`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
