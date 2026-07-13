// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ApiError, Health } from '@switchboard/shared';
import { createTestApp, type TestApp } from './testing/harness';

let harness: TestApp;
let app: TestApp['app'];

beforeAll(async () => {
  harness = await createTestApp({ getEngineStatus: () => 'connected' });
  app = harness.app;
});

afterAll(async () => {
  await harness.close();
});

describe('GET /api/v1/health', () => {
  it('returns ok with the engine status and version', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json<Health>();
    expect(body.status).toBe('ok');
    expect(body.engine).toBe('connected');
    expect(body.version).toMatch(/\d+\.\d+\.\d+/);
  });
});

describe('unknown route', () => {
  it('returns 404 in the error shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json<ApiError>().error.code).toBe('not_found');
  });
});

describe('OpenAPI document and Swagger UI', () => {
  it('serves a valid OpenAPI 3 document whose paths match the contract', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/openapi.json',
    });
    expect(res.statusCode).toBe(200);
    const doc = res.json<{ openapi: string; paths: Record<string, unknown> }>();
    expect(doc.openapi).toMatch(/^3\./);
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        '/api/v1/health',
        '/api/v1/trunks',
        '/api/v1/trunks/{id}',
        '/api/v1/calls',
      ]),
    );
  });

  it('serves Swagger UI at /api/docs', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/docs' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('SwaggerUIBundle');
  });

  it('serves the Swagger UI static assets', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/docs/swagger-ui.css',
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('engine status default', () => {
  it('defaults to disconnected when no getter is supplied', async () => {
    const bare = await createTestApp();
    const res = await bare.app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.json<Health>().engine).toBe('disconnected');
    await bare.close();
  });
});
