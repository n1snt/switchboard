// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { settingsContract } from '@switchboard/shared';
import type { FastifyInstance } from 'fastify';
import type { RegisterOptions, TsRestServer } from '../../http/ts-rest';
import type { SettingsService } from './settings.service';

export async function registerSettingsRoutes(
  s: TsRestServer,
  app: FastifyInstance,
  service: SettingsService,
  options: RegisterOptions,
): Promise<void> {
  const router = s.router(settingsContract, {
    get: async () => ({ status: 200, body: await service.get() }),
    update: async ({ body }) => ({
      status: 200,
      body: await service.update(body),
    }),
  });
  await app.register(s.plugin(router), options);
}
