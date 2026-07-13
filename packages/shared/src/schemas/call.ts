// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common';

// The call log: one row per call attempt. Mirrors the `calls` table in
// data-model.md. Rows are written by the event-bus subscriber (feature 21), not
// created directly through CRUD.

/** Direction, from the system-under-test point of view (never shown raw in the UI). */
export const CallDirectionSchema = z
  .enum(['inbound', 'outbound'])
  .describe('inbound: softphone placed it; outbound: your system placed it.');

/** Lifecycle state of a call. */
export const CallStateSchema = z
  .enum(['created', 'ringing', 'answered', 'ended'])
  .describe('Current lifecycle state of the call.');

export const CallSchema = z
  .object({
    id: IdSchema,
    direction: CallDirectionSchema,
    from_number: z.string().describe('The calling number or SIP URI.'),
    to_number: z.string().describe('The called number or SIP URI.'),
    trunk_id: IdSchema.nullable().describe('The trunk the call used, if any.'),
    state: CallStateSchema,
    started_at: TimestampSchema.describe('When call setup began.'),
    answered_at: TimestampSchema.nullable().describe(
      'When answered; null if never.',
    ),
    ended_at: TimestampSchema.nullable().describe(
      'When the call ended; null while live.',
    ),
    hangup_cause: z
      .string()
      .nullable()
      .describe('Why the call ended, e.g. normal, busy, timeout.'),
    codec: z.string().nullable().describe('The negotiated audio codec.'),
    recording: z
      .string()
      .nullable()
      .describe('Path to the recording file, if recorded.'),
  })
  .describe('A single call attempt and its timeline.');

/**
 * Query parameters for the call log. Direction uses the dashboard's plain
 * language (placed/received); the server maps it to inbound/outbound. Full
 * filtering lands in feature 22.
 */
export const CallListQuerySchema = z.object({
  direction: z
    .enum(['placed', 'received'])
    .optional()
    .describe(
      'placed = softphone placed it; received = softphone received it.',
    ),
  trunk_id: IdSchema.optional(),
  state: CallStateSchema.optional(),
  from: TimestampSchema.optional().describe(
    'Only calls started at or after this time.',
  ),
  to: TimestampSchema.optional().describe(
    'Only calls started at or before this time.',
  ),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/** One signaling message in a call's SIP trace, for the call-ladder diagram. */
export const SipTraceEntrySchema = z.object({
  at: TimestampSchema.describe('When the message was observed.'),
  direction: z
    .enum(['incoming', 'outgoing'])
    .describe('Relative to the engine: a received or a sent message.'),
  method: z
    .string()
    .describe('SIP method or response, e.g. INVITE, 100, 180, 200, ACK, BYE.'),
  summary: z.string().describe('A short human-readable line for the ladder.'),
});

/** Body for toggling recording on an in-progress call (feature 24, per-call). */
export const CallRecordingUpdateSchema = z.object({
  enabled: z.boolean().describe('Whether to record this in-progress call.'),
});

/** A call plus its SIP trace (feature 23), returned by the detail endpoint. */
export const CallDetailSchema = CallSchema.extend({
  sip_trace: z
    .array(SipTraceEntrySchema)
    .describe('The captured SIP ladder for this call.'),
}).describe('A call with its full SIP trace.');

export type CallDirection = z.infer<typeof CallDirectionSchema>;
export type CallState = z.infer<typeof CallStateSchema>;
export type Call = z.infer<typeof CallSchema>;
export type SipTraceEntry = z.infer<typeof SipTraceEntrySchema>;
export type CallDetail = z.infer<typeof CallDetailSchema>;
export type CallListQuery = z.input<typeof CallListQuerySchema>;
export type CallRecordingUpdate = z.infer<typeof CallRecordingUpdateSchema>;

export const CALL_EXAMPLE: Call = {
  id: 'call_YWJjZGVm',
  direction: 'outbound',
  from_number: '+14155550123',
  to_number: 'agent-dev',
  trunk_id: 'trunk_Zm9vYmFy',
  state: 'ended',
  started_at: '2026-07-13T10:02:00.000Z',
  answered_at: '2026-07-13T10:02:02.100Z',
  ended_at: '2026-07-13T10:02:44.000Z',
  hangup_cause: 'normal',
  codec: 'ulaw',
  recording: null,
};
