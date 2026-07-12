// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  HttpError,
  badRequest,
  notFound,
  registerErrorHandler,
  toErrorResponse,
} from './errors';

function zodError(): unknown {
  const result = z.string().safeParse(123);
  return result.success ? new Error('unreachable') : result.error;
}

describe('toErrorResponse', () => {
  it('maps a ZodError to 400 validation_error with details', () => {
    const { statusCode, body } = toErrorResponse(zodError());
    expect(statusCode).toBe(400);
    expect(body.error.code).toBe('validation_error');
    expect(body.error.details).toBeDefined();
  });

  it('uses an HttpError status, code, and message', () => {
    const { statusCode, body } = toErrorResponse(new HttpError(404, 'not_found', 'gone'));
    expect(statusCode).toBe(404);
    expect(body.error).toEqual({ code: 'not_found', message: 'gone' });
  });

  it('honors a status carrier without a code or Error message', () => {
    const { statusCode, body } = toErrorResponse({ statusCode: 429 });
    expect(statusCode).toBe(429);
    expect(body.error.code).toBe('error');
    expect(body.error.message).toBe('Request failed');
  });

  it('reads code and message from a fastify-style error', () => {
    const err = Object.assign(new Error('boom'), { statusCode: 400, code: 'FST_ERR' });
    const { statusCode, body } = toErrorResponse(err);
    expect(statusCode).toBe(400);
    expect(body.error).toEqual({ code: 'FST_ERR', message: 'boom' });
  });

  it('maps a bare Error to 500 with its message', () => {
    const { statusCode, body } = toErrorResponse(new Error('kaboom'));
    expect(statusCode).toBe(500);
    expect(body.error).toEqual({ code: 'internal_error', message: 'kaboom' });
  });

  it.each([
    ['a string', 'oops'],
    ['null', null],
    ['a plain object', {}],
    ['a non-numeric statusCode', { statusCode: 'x' }],
  ])('falls back to 500 for %s', (_label, value) => {
    const { statusCode, body } = toErrorResponse(value);
    expect(statusCode).toBe(500);
    expect(body.error.message).toBe('Internal server error');
  });
});

describe('convenience constructors', () => {
  it('build HttpErrors with the right status and code', () => {
    expect(notFound('x')).toMatchObject({ statusCode: 404, code: 'not_found' });
    expect(badRequest('y')).toMatchObject({ statusCode: 400, code: 'bad_request' });
  });
});

describe('registerErrorHandler (wired into Fastify)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    registerErrorHandler(app);
    app.get('/zod', () => z.string().parse(123));
    app.get('/boom', () => {
      throw new Error('kaboom');
    });
    app.get('/http', () => {
      throw notFound('missing');
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 400 in the error shape for a validation failure', async () => {
    const res = await app.inject({ method: 'GET', url: '/zod' });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('validation_error');
  });

  it('returns 500 for an unexpected error', async () => {
    const res = await app.inject({ method: 'GET', url: '/boom' });
    expect(res.statusCode).toBe(500);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('internal_error');
  });

  it('returns a mapped HttpError', async () => {
    const res = await app.inject({ method: 'GET', url: '/http' });
    expect(res.statusCode).toBe(404);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('not_found');
  });

  it('returns 404 in the error shape for an unknown route', async () => {
    const res = await app.inject({ method: 'GET', url: '/does-not-exist' });
    expect(res.statusCode).toBe(404);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('not_found');
  });
});
