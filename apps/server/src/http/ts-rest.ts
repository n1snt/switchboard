// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { initServer, RequestValidationError } from '@ts-rest/fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ZodError } from 'zod';
import type { ApiError } from '@switchboard/shared';

// Shared plumbing for binding the ts-rest contract to Fastify. Each resource
// module registers its own sub-contract with this server instance, so only
// implemented resources are mounted (faults arrives in Part F).

export type TsRestServer = ReturnType<typeof initServer>;

/** The subset of @ts-rest/fastify register options Switchboard sets. */
export interface RegisterOptions {
  requestValidationErrorHandler:
    | 'combined'
    | ((
        err: RequestValidationError,
        request: FastifyRequest,
        reply: FastifyReply,
      ) => void);
  jsonQuery?: boolean;
}

/** Create the one ts-rest server instance used across resource modules. */
export function createTsRestServer(): TsRestServer {
  return initServer();
}

/** Map a request-validation failure into the single shared error envelope. */
export function validationErrorHandler(
  err: RequestValidationError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  const zerr = [err.body, err.query, err.pathParams, err.headers].find(
    (candidate): candidate is ZodError => candidate !== null,
  );
  const body: ApiError = {
    error: {
      code: 'validation_error',
      message: 'Request validation failed',
      ...(zerr ? { details: zerr.issues } : {}),
    },
  };
  void reply.status(400).send(body);
}

/** The register options every resource module shares. */
export const registerOptions: RegisterOptions = {
  requestValidationErrorHandler: validationErrorHandler,
};
