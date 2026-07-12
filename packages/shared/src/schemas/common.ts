// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

// Primitives shared across every entity schema. Defined once so the wire format,
// the database mapping, and the generated OpenAPI document all agree.

/** Short unique identifier generated with nanoid. */
export const IdSchema = z
  .string()
  .min(1)
  .describe('Short unique identifier (nanoid).');

/** ISO 8601 timestamp, stored as text. */
export const TimestampSchema = z
  .string()
  .datetime({ offset: true })
  .describe('ISO 8601 timestamp, e.g. 2026-07-13T10:02:00.000Z.');

/** A phone number in E.164 format, e.g. +14155550123. */
export const E164Schema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164, e.g. +14155550123')
  .describe('Phone number in E.164 format, e.g. +14155550123.');

/**
 * The single error envelope every endpoint returns on failure. The Fastify
 * error handler (feature 4) produces exactly this shape.
 */
export const ErrorSchema = z
  .object({
    error: z.object({
      code: z.string().describe('Stable, machine-readable error code.'),
      message: z.string().describe('Human-readable explanation.'),
      details: z
        .unknown()
        .optional()
        .describe('Optional structured context, e.g. Zod field issues.'),
    }),
  })
  .describe('Standard error envelope.');

export type ApiError = z.infer<typeof ErrorSchema>;

/** Whether the control plane is connected to the engine over ARI. */
export const EngineStatusSchema = z
  .enum(['connected', 'connecting', 'disconnected'])
  .describe('Control-plane to engine (ARI) connection state.');

export type EngineStatus = z.infer<typeof EngineStatusSchema>;

/** Response body of GET /api/v1/health. */
export const HealthSchema = z
  .object({
    status: z.literal('ok').describe('The control plane is serving requests.'),
    engine: EngineStatusSchema,
    version: z.string().describe('Switchboard version.'),
  })
  .describe('Liveness of the control plane and its engine connection.');

export type Health = z.infer<typeof HealthSchema>;

/**
 * The set of audio codecs Switchboard understands, named the way Asterisk names
 * them (feature 11 maps these straight into engine configuration). The dashboard
 * renders friendlier labels (PCMU, PCMA, ...).
 */
export const CodecSchema = z
  .enum(['ulaw', 'alaw', 'g722', 'opus', 'g729'])
  .describe('Audio codec (ulaw=PCMU, alaw=PCMA, g722, opus, g729).');

export type Codec = z.infer<typeof CodecSchema>;
