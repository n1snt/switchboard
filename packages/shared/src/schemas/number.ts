// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { E164Schema, IdSchema } from './common';

// A number is a DID (Direct Inward Dialing number) the softphone can dial to
// reach the system-under-test. Mirrors the `numbers` table in data-model.md.

export const NumberBaseSchema = z.object({
  e164: E164Schema,
  trunk_id: IdSchema.describe('The inbound trunk that delivers this number.'),
  label: z.string().optional().describe('Optional human-readable label.'),
});

/** POST /numbers body. */
export const NumberCreateSchema = NumberBaseSchema;

/** PATCH /numbers/:id body. */
export const NumberUpdateSchema = NumberBaseSchema.partial();

/** A stored number as returned by the API. */
export const NumberSchema = NumberBaseSchema.extend({
  id: IdSchema,
}).describe('A phone number (DID) assigned to an inbound trunk.');

export type PhoneNumber = z.infer<typeof NumberSchema>;
export type PhoneNumberCreate = z.input<typeof NumberCreateSchema>;
export type PhoneNumberUpdate = z.input<typeof NumberUpdateSchema>;

export const NUMBER_EXAMPLE: PhoneNumber = {
  id: 'num_MTQxNTU',
  e164: '+14155550123',
  trunk_id: 'trunk_Zm9vYmFy',
  label: 'Main line',
};
