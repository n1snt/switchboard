// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { nanoid } from 'nanoid';
import type { z } from 'zod';
import type { RouteBaseSchema, RouteUpdateSchema } from '@switchboard/shared';
import type { Route } from '@switchboard/shared';
import { notFound } from '../../plugins/errors';
import { applyUpdate } from '../../util/patch';
import type { RouteRepo } from './routes.repo';

export type RouteInput = z.infer<typeof RouteBaseSchema>;
export type RouteUpdateInput = z.infer<typeof RouteUpdateSchema>;

export class RouteService {
  constructor(private readonly repo: RouteRepo) {}

  list(): Promise<Route[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<Route> {
    const route = await this.repo.get(id);
    if (!route) {
      throw notFound(`Route ${id} not found`);
    }
    return route;
  }

  async create(input: RouteInput): Promise<Route> {
    const route: Route = { ...input, id: `route_${nanoid()}` };
    await this.repo.insert(route);
    return route;
  }

  async update(id: string, patch: RouteUpdateInput): Promise<Route> {
    const existing = await this.get(id);
    const merged = applyUpdate(existing, patch);
    await this.repo.replace(merged);
    return merged;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) {
      throw notFound(`Route ${id} not found`);
    }
  }
}
