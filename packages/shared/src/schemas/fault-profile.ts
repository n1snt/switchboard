// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { CodecSchema, IdSchema } from './common';

// A named, reusable bundle of fault-injection settings, attachable to a trunk or
// a route. Mirrors the `fault_profiles` table (added by feature 26). The schema
// lives here from the start so the contract and OpenAPI document are complete.

export const AudioModeSchema = z
  .enum(['normal', 'one_way', 'silent'])
  .describe('normal, one-way audio, or silent (no audio).');

export const FaultProfileBaseSchema = z.object({
  name: z.string().min(1).describe('Human-readable label.'),
  reject_code: z
    .number()
    .int()
    .min(400)
    .max(699)
    .optional()
    .describe('Optional SIP rejection code, e.g. 486 for busy.'),
  reject_after_ms: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Delay before an asynchronous rejection is sent.'),
  answer_delay_ms: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Delay before answering, to simulate slow pickup.'),
  audio_mode: AudioModeSchema.default('normal'),
  force_codec: CodecSchema.optional().describe(
    'Force a codec, overriding negotiation.',
  ),
});

/** POST /faults body. */
export const FaultProfileCreateSchema = FaultProfileBaseSchema;

/** PATCH /faults/:id body. */
export const FaultProfileUpdateSchema = FaultProfileBaseSchema.partial();

/** A stored fault profile as returned by the API. */
export const FaultProfileSchema = FaultProfileBaseSchema.extend({
  id: IdSchema,
}).describe('A reusable bundle of carrier fault-injection settings.');

export type AudioMode = z.infer<typeof AudioModeSchema>;
export type FaultProfile = z.infer<typeof FaultProfileSchema>;
export type FaultProfileCreate = z.input<typeof FaultProfileCreateSchema>;
export type FaultProfileUpdate = z.input<typeof FaultProfileUpdateSchema>;

export const FAULT_PROFILE_EXAMPLE: FaultProfile = {
  id: 'fault_YnVzeQ',
  name: 'delayed-busy',
  reject_code: 486,
  reject_after_ms: 5000,
  audio_mode: 'normal',
};
