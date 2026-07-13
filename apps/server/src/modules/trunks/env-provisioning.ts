// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import {
  AuthModeSchema,
  CodecSchema,
  TransportSchema,
  TrunkCreateSchema,
  TrunkDirectionSchema,
} from '@switchboard/shared';
import type { Logger } from '../../logger';
import type { TrunkService } from './trunks.service';

// Feature 13: trunks seeded from SWITCHBOARD_SIP_SERVERS at boot. The environment
// format is camelCase (dashboard.md); each entry is mapped to the snake_case
// trunk schema and validated, then upserted by name with source `env` so the
// environment stays the source of truth across restarts.

export const EnvSipServerSchema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).optional(),
  transport: TransportSchema.optional(),
  authMode: AuthModeSchema.optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  techPrefix: z.string().optional(),
  codecs: z.array(CodecSchema).optional(),
  direction: TrunkDirectionSchema.optional(),
});

export const EnvSipServersSchema = z.array(EnvSipServerSchema);
export type EnvSipServer = z.infer<typeof EnvSipServerSchema>;

function toTrunkInput(entry: EnvSipServer): z.infer<typeof TrunkCreateSchema> {
  return TrunkCreateSchema.parse({
    name: entry.name,
    target_host: entry.host,
    ...(entry.port !== undefined ? { target_port: entry.port } : {}),
    ...(entry.transport ? { transport: entry.transport } : {}),
    ...(entry.authMode ? { auth_mode: entry.authMode } : {}),
    ...(entry.username ? { username: entry.username } : {}),
    ...(entry.password ? { password: entry.password } : {}),
    ...(entry.codecs ? { codecs: entry.codecs } : {}),
    ...(entry.direction ? { direction: entry.direction } : {}),
    ...(entry.techPrefix
      ? { dial_rewrite: { tech_prefix: entry.techPrefix, rules: [] } }
      : {}),
  });
}

/**
 * Seed trunks from the raw SWITCHBOARD_SIP_SERVERS JSON. Throws a clear error on
 * malformed or invalid input. Returns the number of trunks applied.
 */
export async function applyEnvTrunks(
  raw: string,
  service: TrunkService,
  logger: Logger,
): Promise<number> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('SWITCHBOARD_SIP_SERVERS is not valid JSON');
  }
  const result = EnvSipServersSchema.safeParse(parsed);
  if (!result.success) {
    const detail = result.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`SWITCHBOARD_SIP_SERVERS is invalid: ${detail}`);
  }
  for (const entry of result.data) {
    await service.upsertByName(toTrunkInput(entry), 'env');
  }
  logger.info(
    `env: provisioned ${result.data.length} trunk(s) from SWITCHBOARD_SIP_SERVERS`,
  );
  return result.data.length;
}
