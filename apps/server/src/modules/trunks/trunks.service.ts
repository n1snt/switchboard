// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { nanoid } from 'nanoid';
import type { z } from 'zod';
import type { TrunkBaseSchema, TrunkUpdateSchema } from '@switchboard/shared';
import type { Trunk, TrunkSource } from '@switchboard/shared';
import { notFound } from '../../plugins/errors';
import { applyUpdate } from '../../util/patch';
import type { TrunkRepo } from './trunks.repo';
import type { TrunkProvisioner } from './provisioner';

/** The validated, defaults-applied trunk input (the create body's parsed value). */
export type TrunkInput = z.infer<typeof TrunkBaseSchema>;
export type TrunkUpdateInput = z.infer<typeof TrunkUpdateSchema>;

// Logic beyond the schema: id and timestamp generation, and reflecting a saved
// trunk onto the engine through the provisioner. Never queries the database
// directly (that is the repo's job).
export class TrunkService {
  constructor(
    private readonly repo: TrunkRepo,
    private readonly provisioner: TrunkProvisioner,
  ) {}

  list(): Promise<Trunk[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<Trunk> {
    const trunk = await this.repo.get(id);
    if (!trunk) {
      throw notFound(`Trunk ${id} not found`);
    }
    return trunk;
  }

  async create(input: TrunkInput, source: TrunkSource = 'ui'): Promise<Trunk> {
    const trunk: Trunk = {
      ...input,
      id: `trunk_${nanoid()}`,
      source,
      created_at: new Date().toISOString(),
    };
    await this.repo.insert(trunk);
    await this.provisioner.apply(trunk);
    return trunk;
  }

  /** Upsert by name; used by environment provisioning (feature 13). */
  async upsertByName(input: TrunkInput, source: TrunkSource): Promise<Trunk> {
    const existing = await this.repo.findByName(input.name);
    if (!existing) {
      return this.create(input, source);
    }
    const merged: Trunk = { ...existing, ...input, source };
    await this.repo.replace(merged);
    await this.provisioner.apply(merged);
    return merged;
  }

  async update(id: string, patch: TrunkUpdateInput): Promise<Trunk> {
    const existing = await this.get(id);
    const merged = applyUpdate(existing, patch);
    await this.repo.replace(merged);
    await this.provisioner.apply(merged);
    return merged;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) {
      throw notFound(`Trunk ${id} not found`);
    }
    await this.provisioner.remove(id);
  }
}
