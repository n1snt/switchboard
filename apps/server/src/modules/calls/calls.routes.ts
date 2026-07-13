// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { callsContract } from '@switchboard/shared';
import type { FastifyInstance } from 'fastify';
import type { RegisterOptions, TsRestServer } from '../../http/ts-rest';
import type { CallService } from './calls.service';

export async function registerCallRoutes(
  s: TsRestServer,
  app: FastifyInstance,
  service: CallService,
  options: RegisterOptions,
): Promise<void> {
  const router = s.router(callsContract, {
    list: async ({ query }) => ({
      status: 200,
      body: await service.list(query),
    }),
    get: async ({ params }) => ({
      status: 200,
      body: await service.get(params.id),
    }),
  });
  await app.register(s.plugin(router), options);
}
