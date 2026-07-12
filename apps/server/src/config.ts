// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

// Typed, validated configuration parsed from the environment. Nothing past this
// boundary is trusted; invalid config fails fast at boot with a clear message.

/** Coerce an environment string to a boolean ("true"/"1" are true). */
function envBool(value: unknown): boolean {
  return value === 'true' || value === '1';
}

const RawEnvSchema = z.object({
  // Defaults bind to loopback for the single-user localhost story; Docker sets
  // SWITCHBOARD_HOST=0.0.0.0 so the web container can reach the API.
  SWITCHBOARD_HOST: z.string().min(1).default('127.0.0.1'),
  SWITCHBOARD_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SWITCHBOARD_DATABASE_PATH: z
    .string()
    .min(1)
    .default('./data/switchboard.sqlite'),
  SWITCHBOARD_ARI_URL: z.string().url().default('http://127.0.0.1:8088'),
  SWITCHBOARD_ARI_USERNAME: z.string().min(1).default('switchboard'),
  SWITCHBOARD_ARI_PASSWORD: z.string().min(1).default('switchboard'),
  SWITCHBOARD_ARI_APP: z.string().min(1).default('switchboard'),
  SWITCHBOARD_RECORDINGS_DIR: z.string().min(1).default('./recordings'),
  SWITCHBOARD_RECORD_ALL: z.preprocess(envBool, z.boolean()).default(false),
  SWITCHBOARD_SIP_SERVERS: z.string().default('[]'),
  // Unset means single-origin (no CORS headers); set it for the direct-origin
  // alternative where the browser talks to the API on a different host.
  SWITCHBOARD_CORS_ORIGIN: z.string().min(1).optional(),
});

export interface AriConfig {
  url: string;
  username: string;
  password: string;
  app: string;
}

export interface Config {
  host: string;
  port: number;
  databasePath: string;
  ari: AriConfig;
  recordingsDir: string;
  recordAll: boolean;
  /** Raw SWITCHBOARD_SIP_SERVERS JSON; parsed by feature 13. */
  sipServers: string;
  /** CORS origin, or false to emit no CORS headers (single-origin default). */
  corsOrigin: string | false;
}

/**
 * Parse and validate configuration from `env` (defaults to `process.env`).
 * Throws a single, readable error listing every invalid field.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = RawEnvSchema.safeParse(env);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid configuration: ${detail}`);
  }
  const raw = result.data;
  return {
    host: raw.SWITCHBOARD_HOST,
    port: raw.SWITCHBOARD_PORT,
    databasePath: raw.SWITCHBOARD_DATABASE_PATH,
    ari: {
      url: raw.SWITCHBOARD_ARI_URL,
      username: raw.SWITCHBOARD_ARI_USERNAME,
      password: raw.SWITCHBOARD_ARI_PASSWORD,
      app: raw.SWITCHBOARD_ARI_APP,
    },
    recordingsDir: raw.SWITCHBOARD_RECORDINGS_DIR,
    recordAll: raw.SWITCHBOARD_RECORD_ALL,
    sipServers: raw.SWITCHBOARD_SIP_SERVERS,
    corsOrigin: raw.SWITCHBOARD_CORS_ORIGIN ?? false,
  };
}
