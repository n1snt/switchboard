// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import Fastify from 'fastify';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import {
  contract,
  HealthSchema,
  SWITCHBOARD_VERSION,
} from '@switchboard/shared';
import type { EngineStatus, Health } from '@switchboard/shared';
import type { Config } from './config';
import type { Db } from './db';
import type { EventBus } from './events/bus';
import { registerEventStream } from './events/ws';
import { registerErrorHandler } from './plugins/errors';
import { registerOpenApi } from './plugins/openapi';
import {
  buildServices,
  registerApiRoutes,
  type ApiServices,
} from './http/router';
import {
  noopProvisioner,
  type TrunkProvisioner,
} from './modules/trunks/provisioner';
import { CallRepo } from './modules/calls/calls.repo';
import type { RecordingControl } from './modules/calls/recording-control';
import { registerRecordingRoutes } from './modules/recording/recording';

export interface AppOptions {
  config: Config;
  /** The database the resource repositories read and write. */
  db: Db;
  /** The internal event bus, streamed to dashboards over the WS route. */
  bus: EventBus;
  /** Reflects trunks onto the engine; defaults to a no-op for engine-less runs. */
  provisioner?: TrunkProvisioner;
  /**
   * Reports the live ARI connection state for the health endpoint. Feature 7
   * supplies the real getter; it defaults to `disconnected` so the app is
   * testable without an engine.
   */
  getEngineStatus?: () => EngineStatus;
  /** Controls recording on live calls (feature 24); defaults to a no-op. */
  recordingControl?: RecordingControl;
  logger?: FastifyServerOptions['logger'];
}

/**
 * Build the Fastify application: CORS (a no-op single-origin default), the shared
 * error handler, the self-documenting OpenAPI/Swagger UI, and the health
 * endpoint. Resource routes are registered by their own features. Does not
 * listen; server.ts owns the lifecycle.
 */
export async function buildApp(
  options: AppOptions,
): Promise<{ app: FastifyInstance; services: ApiServices }> {
  const {
    config,
    db,
    bus,
    provisioner = noopProvisioner,
    getEngineStatus = (): EngineStatus => 'disconnected',
    recordingControl,
    logger = false,
  } = options;

  const app = Fastify({ logger });

  await app.register(cors, { origin: config.corsOrigin });
  registerErrorHandler(app);
  await registerOpenApi(app);
  await registerEventStream(app, bus);

  app.get(contract.health.get.path, () => {
    const body: Health = {
      status: 'ok',
      engine: getEngineStatus(),
      version: SWITCHBOARD_VERSION,
    };
    return HealthSchema.parse(body);
  });

  const services = buildServices({
    db,
    bus,
    provisioner,
    ...(recordingControl ? { recordingControl } : {}),
  });
  await registerApiRoutes(app, services);
  registerRecordingRoutes(app, new CallRepo(db), config.recordingsDir);

  return { app, services };
}
