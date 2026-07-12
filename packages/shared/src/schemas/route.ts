// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { IdSchema } from './common';

// A route maps a dialed pattern to a destination, with a priority. Mirrors the
// `routes` table in data-model.md. Matching logic lives in feature 15.

export const RouteDirectionSchema = z
  .enum(['inbound', 'outbound'])
  .describe('Direction, from the system-under-test point of view.');

export const RouteBaseSchema = z.object({
  direction: RouteDirectionSchema,
  match: z
    .string()
    .min(1)
    .describe('A number or a pattern to match the dialed number against.'),
  destination: z
    .string()
    .min(1)
    .describe(
      'Where a matched call goes: `softphone` (outbound) or a trunk id (inbound).',
    ),
  priority: z
    .number()
    .int()
    .default(100)
    .describe('Evaluation order when several routes match; lower runs first.'),
});

/** POST /routes body. */
export const RouteCreateSchema = RouteBaseSchema;

/** PATCH /routes/:id body. */
export const RouteUpdateSchema = RouteBaseSchema.partial();

/** A stored route as returned by the API. */
export const RouteSchema = RouteBaseSchema.extend({
  id: IdSchema,
}).describe('A routing rule mapping a dialed pattern to a destination.');

export type RouteDirection = z.infer<typeof RouteDirectionSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type RouteCreate = z.input<typeof RouteCreateSchema>;
export type RouteUpdate = z.input<typeof RouteUpdateSchema>;

export const ROUTE_EXAMPLE: Route = {
  id: 'route_ZGVmYXVsdA',
  direction: 'outbound',
  match: '+1415*',
  destination: 'softphone',
  priority: 100,
};
