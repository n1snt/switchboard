// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { ZodError } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { ApiError } from '@switchboard/shared';

// One error handler, one JSON shape: { error: { code, message, details? } }, the
// same envelope the contract declares (ErrorSchema). Routes and services throw
// HttpError for expected failures; anything else becomes a 500.

/** An expected HTTP failure a service can throw (e.g. not found, bad request). */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Convenience constructors for the common cases. */
export const notFound = (message: string): HttpError =>
  new HttpError(404, 'not_found', message);
export const badRequest = (message: string): HttpError =>
  new HttpError(400, 'bad_request', message);

interface StatusCarrier {
  statusCode: number;
  code?: string;
}

function hasStatusCode(err: unknown): err is StatusCarrier {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof err.statusCode === 'number'
  );
}

/** Map any thrown value to a status code and the shared error envelope. */
export function toErrorResponse(err: unknown): {
  statusCode: number;
  body: ApiError;
} {
  if (err instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        error: {
          code: 'validation_error',
          message: 'Request validation failed',
          details: err.issues,
        },
      },
    };
  }
  if (hasStatusCode(err)) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return {
      statusCode: err.statusCode,
      body: { error: { code: err.code ?? 'error', message } },
    };
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  return {
    statusCode: 500,
    body: { error: { code: 'internal_error', message } },
  };
}

/** Install the not-found and error handlers on the Fastify instance. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send({
      error: {
        code: 'not_found',
        message: `Route ${request.method} ${request.url} not found`,
      },
    } satisfies ApiError);
  });

  app.setErrorHandler((err, request, reply) => {
    const { statusCode, body } = toErrorResponse(err);
    if (statusCode >= 500) {
      request.log.error(err);
    }
    void reply.status(statusCode).send(body);
  });
}
