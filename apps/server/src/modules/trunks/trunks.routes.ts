// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { trunksContract } from '@switchboard/shared';
import type { FastifyInstance } from 'fastify';
import type { RegisterOptions, TsRestServer } from '../../http/ts-rest';
import type { TrunkService } from './trunks.service';

// HTTP for trunks: validates against trunksContract and delegates to the
// service. Not-found and validation failures become the shared error envelope
// (see plugins/errors.ts and http/ts-rest.ts).
export async function registerTrunkRoutes(
  s: TsRestServer,
  app: FastifyInstance,
  service: TrunkService,
  options: RegisterOptions,
): Promise<void> {
  const router = s.router(trunksContract, {
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
  // Encapsulated child scope so ts-rest's per-router error handler does not
  // override the root handler (which owns the shared error envelope).
  await app.register(s.plugin(router), options);
}
