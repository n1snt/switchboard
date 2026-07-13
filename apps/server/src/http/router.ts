// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { FastifyInstance } from 'fastify';
import type { Db } from '../db';
import type { EventBus } from '../events/bus';
import type { TrunkProvisioner } from '../modules/trunks/provisioner';
import { TrunkRepo } from '../modules/trunks/trunks.repo';
import { TrunkService } from '../modules/trunks/trunks.service';
import { registerTrunkRoutes } from '../modules/trunks/trunks.routes';
import { NumberRepo } from '../modules/numbers/numbers.repo';
import { NumberService } from '../modules/numbers/numbers.service';
import { registerNumberRoutes } from '../modules/numbers/numbers.routes';
import { RouteRepo } from '../modules/routes/routes.repo';
import { RouteService } from '../modules/routes/routes.service';
import { registerRouteRoutes } from '../modules/routes/routes.routes';
import { CallRepo } from '../modules/calls/calls.repo';
import { CallService } from '../modules/calls/calls.service';
import { registerCallRoutes } from '../modules/calls/calls.routes';
import {
  noopRecordingControl,
  type RecordingControl,
} from '../modules/calls/recording-control';
import { InMemorySipTraceStore } from '../modules/calls/trace-store';
import { SettingsRepo } from '../modules/settings/settings.repo';
import { SettingsService } from '../modules/settings/settings.service';
import { registerSettingsRoutes } from '../modules/settings/settings.routes';
import { createTsRestServer, registerOptions } from './ts-rest';

export interface ApiDeps {
  db: Db;
  bus: EventBus;
  provisioner: TrunkProvisioner;
  /** Controls recording on live calls; defaults to a no-op for engine-less runs. */
  recordingControl?: RecordingControl;
}

/** The services the control plane builds once and shares (routes and background). */
export interface ApiServices {
  trunks: TrunkService;
  numbers: NumberService;
  routes: RouteService;
  calls: CallService;
  settings: SettingsService;
  /** The SIP trace store the engine capture feeds and the detail endpoint reads. */
  traceStore: InMemorySipTraceStore;
}

/** Build the resource services from the database and provisioner. */
export function buildServices(deps: ApiDeps): ApiServices {
  const traceStore = new InMemorySipTraceStore();
  return {
    trunks: new TrunkService(new TrunkRepo(deps.db), deps.provisioner),
    numbers: new NumberService(new NumberRepo(deps.db), new TrunkRepo(deps.db)),
    routes: new RouteService(new RouteRepo(deps.db)),
    calls: new CallService(
      new CallRepo(deps.db),
      traceStore,
      deps.recordingControl ?? noopRecordingControl,
    ),
    settings: new SettingsService(new SettingsRepo(deps.db)),
    traceStore,
  };
}

/** Register every implemented resource sub-contract on the Fastify instance. */
export async function registerApiRoutes(
  app: FastifyInstance,
  services: ApiServices,
): Promise<void> {
  const s = createTsRestServer();
  await registerTrunkRoutes(s, app, services.trunks, registerOptions);
  await registerNumberRoutes(s, app, services.numbers, registerOptions);
  await registerRouteRoutes(s, app, services.routes, registerOptions);
  await registerCallRoutes(s, app, services.calls, registerOptions);
  await registerSettingsRoutes(s, app, services.settings, registerOptions);
}
