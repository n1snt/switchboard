// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { generateOpenApi } from '@ts-rest/open-api';
import fastifyStatic from '@fastify/static';
import { contract, SWITCHBOARD_VERSION } from '@switchboard/shared';
import { getAbsoluteFSPath } from 'swagger-ui-dist';
import type { FastifyInstance } from 'fastify';

// The API is self-documenting: the OpenAPI 3 document is generated from the one
// ts-rest contract, so it never drifts and grows automatically as endpoint
// features land. Feature 28 hardens examples for public release.

/** Build the OpenAPI 3 document from the shared contract. */
export function buildOpenApiDocument(): ReturnType<typeof generateOpenApi> {
  return generateOpenApi(
    contract,
    {
      info: {
        title: 'Switchboard API',
        version: SWITCHBOARD_VERSION,
        description:
          'The Switchboard control-plane REST API. A local telephony sandbox: fake carrier, fake far-end phone, and an admin panel.',
      },
      servers: [{ url: '/', description: 'This Switchboard instance' }],
    },
    // Derive operationIds from the path; the leaf route keys (get, list, ...)
    // repeat across resources and would collide with `true`.
    { setOperationId: 'concatenated-path' },
  );
}

/** Minimal Swagger UI page that loads the generated spec. */
function swaggerHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Switchboard API</title>
    <link rel="stylesheet" href="/api/docs/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api/docs/swagger-ui-bundle.js"></script>
    <script src="/api/docs/swagger-ui-standalone-preset.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
      });
    </script>
  </body>
</html>`;
}

/**
 * Serve the OpenAPI document at /api/v1/openapi.json and interactive Swagger UI
 * at /api/docs. Both are reachable directly and through the switchboard-web proxy.
 */
export async function registerOpenApi(app: FastifyInstance): Promise<void> {
  const document = buildOpenApiDocument();

  app.get('/api/v1/openapi.json', () => document);

  await app.register(fastifyStatic, {
    root: getAbsoluteFSPath(),
    prefix: '/api/docs/',
    index: false,
    list: false,
  });

  app.get('/api/docs', (_request, reply) => {
    void reply.type('text/html').send(swaggerHtml());
  });
}
