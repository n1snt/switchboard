// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { routesContract } from '@switchboard/shared';
import type { FastifyInstance } from 'fastify';
import type { RegisterOptions, TsRestServer } from '../../http/ts-rest';
import type { RouteService } from './routes.service';

export async function registerRouteRoutes(
  s: TsRestServer,
  app: FastifyInstance,
  service: RouteService,
  options: RegisterOptions,
): Promise<void> {
  const router = s.router(routesContract, {
    list: async () => ({ status: 200, body: await service.list() }),
    create: async ({ body }) => ({
      status: 201,
      body: await service.create(body),
    }),
    get: async ({ params }) => ({
      status: 200,
      body: await service.get(params.id),
    }),
    update: async ({ params, body }) => ({
      status: 200,
      body: await service.update(params.id, body),
    }),
    remove: async ({ params }) => {
      await service.remove(params.id);
      return { status: 204, body: undefined };
    },
  });
  await app.register(s.plugin(router), options);
}
