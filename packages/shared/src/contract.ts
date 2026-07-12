// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { ErrorSchema, HealthSchema, IdSchema } from './schemas/common';
import {
  TrunkCreateSchema,
  TrunkSchema,
  TrunkUpdateSchema,
} from './schemas/trunk';
import {
  NumberCreateSchema,
  NumberSchema,
  NumberUpdateSchema,
} from './schemas/number';
import {
  RouteCreateSchema,
  RouteSchema,
  RouteUpdateSchema,
} from './schemas/route';
import { CallListQuerySchema, CallSchema } from './schemas/call';
import {
  FaultProfileCreateSchema,
  FaultProfileSchema,
  FaultProfileUpdateSchema,
} from './schemas/fault-profile';
import { SettingsSchema, SettingsUpdateSchema } from './schemas/settings';

// The single typed REST contract. Fastify routes (feature 4+) implement it and
// the web/CLI clients are generated from it, so an entity or endpoint shape is
// never redefined. Every path is written in full under /api/v1; additive changes
// stay in v1, a breaking change would mint /api/v2 (see CLAUDE.md).

const c = initContract();

/** Path params for the single-resource endpoints. */
const IdParams = z.object({ id: IdSchema });

export const healthContract = c.router({
  get: {
    method: 'GET',
    path: '/api/v1/health',
    summary: 'Health and engine status',
    description:
      'Liveness of the control plane plus whether it is connected to the engine over ARI.',
    responses: { 200: HealthSchema },
  },
});

export const trunksContract = c.router({
  list: {
    method: 'GET',
    path: '/api/v1/trunks',
    summary: 'List trunks',
    description:
      'Every configured trunk, both dashboard- and environment-managed.',
    responses: { 200: z.array(TrunkSchema) },
  },
  create: {
    method: 'POST',
    path: '/api/v1/trunks',
    summary: 'Create a trunk',
    description:
      'Create a trunk. A dialable or deliverable trunk is provisioned on the engine.',
    body: TrunkCreateSchema,
    responses: { 201: TrunkSchema, 400: ErrorSchema },
  },
  get: {
    method: 'GET',
    path: '/api/v1/trunks/:id',
    summary: 'Get a trunk',
    pathParams: IdParams,
    responses: { 200: TrunkSchema, 404: ErrorSchema },
  },
  update: {
    method: 'PATCH',
    path: '/api/v1/trunks/:id',
    summary: 'Update a trunk',
    pathParams: IdParams,
    body: TrunkUpdateSchema,
    responses: { 200: TrunkSchema, 400: ErrorSchema, 404: ErrorSchema },
  },
  remove: {
    method: 'DELETE',
    path: '/api/v1/trunks/:id',
    summary: 'Delete a trunk',
    pathParams: IdParams,
    responses: { 204: c.noBody(), 404: ErrorSchema },
  },
});

export const numbersContract = c.router({
  list: {
    method: 'GET',
    path: '/api/v1/numbers',
    summary: 'List numbers',
    responses: { 200: z.array(NumberSchema) },
  },
  create: {
    method: 'POST',
    path: '/api/v1/numbers',
    summary: 'Create a number',
    description: 'Assign a phone number (DID) to an inbound-capable trunk.',
    body: NumberCreateSchema,
    responses: { 201: NumberSchema, 400: ErrorSchema },
  },
  get: {
    method: 'GET',
    path: '/api/v1/numbers/:id',
    summary: 'Get a number',
    pathParams: IdParams,
    responses: { 200: NumberSchema, 404: ErrorSchema },
  },
  update: {
    method: 'PATCH',
    path: '/api/v1/numbers/:id',
    summary: 'Update a number',
    pathParams: IdParams,
    body: NumberUpdateSchema,
    responses: { 200: NumberSchema, 400: ErrorSchema, 404: ErrorSchema },
  },
  remove: {
    method: 'DELETE',
    path: '/api/v1/numbers/:id',
    summary: 'Delete a number',
    pathParams: IdParams,
    responses: { 204: c.noBody(), 404: ErrorSchema },
  },
});

export const routesContract = c.router({
  list: {
    method: 'GET',
    path: '/api/v1/routes',
    summary: 'List routing rules',
    responses: { 200: z.array(RouteSchema) },
  },
  create: {
    method: 'POST',
    path: '/api/v1/routes',
    summary: 'Create a routing rule',
    body: RouteCreateSchema,
    responses: { 201: RouteSchema, 400: ErrorSchema },
  },
  get: {
    method: 'GET',
    path: '/api/v1/routes/:id',
    summary: 'Get a routing rule',
    pathParams: IdParams,
    responses: { 200: RouteSchema, 404: ErrorSchema },
  },
  update: {
    method: 'PATCH',
    path: '/api/v1/routes/:id',
    summary: 'Update a routing rule',
    pathParams: IdParams,
    body: RouteUpdateSchema,
    responses: { 200: RouteSchema, 400: ErrorSchema, 404: ErrorSchema },
  },
  remove: {
    method: 'DELETE',
    path: '/api/v1/routes/:id',
    summary: 'Delete a routing rule',
    pathParams: IdParams,
    responses: { 204: c.noBody(), 404: ErrorSchema },
  },
});

export const callsContract = c.router({
  list: {
    method: 'GET',
    path: '/api/v1/calls',
    summary: 'List calls',
    description:
      'The call log, filterable by direction (placed/received), trunk, state, and time range.',
    query: CallListQuerySchema,
    responses: { 200: z.array(CallSchema) },
  },
  get: {
    method: 'GET',
    path: '/api/v1/calls/:id',
    summary: 'Get a call',
    pathParams: IdParams,
    responses: { 200: CallSchema, 404: ErrorSchema },
  },
});

export const faultsContract = c.router({
  list: {
    method: 'GET',
    path: '/api/v1/faults',
    summary: 'List fault profiles',
    responses: { 200: z.array(FaultProfileSchema) },
  },
  create: {
    method: 'POST',
    path: '/api/v1/faults',
    summary: 'Create a fault profile',
    body: FaultProfileCreateSchema,
    responses: { 201: FaultProfileSchema, 400: ErrorSchema },
  },
  get: {
    method: 'GET',
    path: '/api/v1/faults/:id',
    summary: 'Get a fault profile',
    pathParams: IdParams,
    responses: { 200: FaultProfileSchema, 404: ErrorSchema },
  },
  update: {
    method: 'PATCH',
    path: '/api/v1/faults/:id',
    summary: 'Update a fault profile',
    pathParams: IdParams,
    body: FaultProfileUpdateSchema,
    responses: { 200: FaultProfileSchema, 400: ErrorSchema, 404: ErrorSchema },
  },
  remove: {
    method: 'DELETE',
    path: '/api/v1/faults/:id',
    summary: 'Delete a fault profile',
    pathParams: IdParams,
    responses: { 204: c.noBody(), 404: ErrorSchema },
  },
});

export const settingsContract = c.router({
  get: {
    method: 'GET',
    path: '/api/v1/settings',
    summary: 'Get global settings',
    responses: { 200: SettingsSchema },
  },
  update: {
    method: 'PATCH',
    path: '/api/v1/settings',
    summary: 'Update global settings',
    body: SettingsUpdateSchema,
    responses: { 200: SettingsSchema, 400: ErrorSchema },
  },
});

/** The root contract the server implements and the clients are built from. */
export const contract = c.router({
  health: healthContract,
  trunks: trunksContract,
  numbers: numbersContract,
  routes: routesContract,
  calls: callsContract,
  faults: faultsContract,
  settings: settingsContract,
});

export type Contract = typeof contract;
