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

  const app = await buildApp({
    config,
    bus,
    logger: { level: 'info' },
    getEngineStatus: () => ari.getStatus(),
  });

  const ari = createAri({
    connect: realConnector(config.ari),
    appName: config.ari.app,
    bus,
    logger: buildLogger(app.log),
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
  app.log.info(`Switchboard API listening on http://${config.host}:${config.port}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
