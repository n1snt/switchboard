// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { CallSchema, CallStateSchema } from './schemas/call';
import { TimestampSchema } from './schemas/common';

// The discriminated union of call lifecycle events. This is the one shape the
// internal event bus (feature 8), the WebSocket stream to the dashboard, and the
// webhooks (feature 31) all carry. Every payload includes the full call snapshot
// so subscribers never have to re-fetch.

const eventBase = {
  at: TimestampSchema.describe('When the event occurred.'),
  call: CallSchema,
};

export const CallCreatedEventSchema = z.object({
  type: z.literal('call.created'),
  ...eventBase,
});

export const CallRingingEventSchema = z.object({
  type: z.literal('call.ringing'),
  ...eventBase,
});

export const CallAnsweredEventSchema = z.object({
  type: z.literal('call.answered'),
  ...eventBase,
});

export const CallEndedEventSchema = z.object({
  type: z.literal('call.ended'),
  ...eventBase,
});

export const CallStateChangedEventSchema = z.object({
  type: z.literal('call.state_changed'),
  ...eventBase,
  state: CallStateSchema.describe('The state the call transitioned into.'),
});

/** Any call lifecycle event, discriminated on `type`. */
export const CallEventSchema = z.discriminatedUnion('type', [
  CallCreatedEventSchema,
  CallRingingEventSchema,
  CallAnsweredEventSchema,
  CallEndedEventSchema,
  CallStateChangedEventSchema,
]);

export type CallCreatedEvent = z.infer<typeof CallCreatedEventSchema>;
export type CallRingingEvent = z.infer<typeof CallRingingEventSchema>;
export type CallAnsweredEvent = z.infer<typeof CallAnsweredEventSchema>;
export type CallEndedEvent = z.infer<typeof CallEndedEventSchema>;
export type CallStateChangedEvent = z.infer<typeof CallStateChangedEventSchema>;
export type CallEvent = z.infer<typeof CallEventSchema>;

/** The discriminant values, useful for exhaustive handling and tests. */
export type CallEventType = CallEvent['type'];
