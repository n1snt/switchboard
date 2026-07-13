// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { nanoid } from 'nanoid';
import type { z } from 'zod';
import type { NumberBaseSchema, NumberUpdateSchema } from '@switchboard/shared';
import type { PhoneNumber } from '@switchboard/shared';
import { badRequest, notFound } from '../../plugins/errors';
import { applyUpdate } from '../../util/patch';
import type { TrunkRepo } from '../trunks/trunks.repo';
import type { NumberRepo } from './numbers.repo';

export type NumberInput = z.infer<typeof NumberBaseSchema>;
export type NumberUpdateInput = z.infer<typeof NumberUpdateSchema>;

// A number must reference a trunk that exists and carries inbound calls, since
// dialing the number delivers it to that trunk's target (data-model.md).
export class NumberService {
  constructor(
    private readonly repo: NumberRepo,
    private readonly trunks: TrunkRepo,
  ) {}

  list(): Promise<PhoneNumber[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<PhoneNumber> {
    const number = await this.repo.get(id);
    if (!number) {
      throw notFound(`Number ${id} not found`);
    }
    return number;
  }

  private async assertInboundTrunk(trunkId: string): Promise<void> {
    const trunk = await this.trunks.get(trunkId);
    if (!trunk) {
      throw badRequest(`Trunk ${trunkId} does not exist`);
    }
    if (trunk.direction === 'outbound') {
      throw badRequest(`Trunk ${trunkId} does not carry inbound calls`);
    }
  }

  async create(input: NumberInput): Promise<PhoneNumber> {
    await this.assertInboundTrunk(input.trunk_id);
    const number: PhoneNumber = { ...input, id: `num_${nanoid()}` };
    await this.repo.insert(number);
    return number;
  }

  async update(id: string, patch: NumberUpdateInput): Promise<PhoneNumber> {
    const existing = await this.get(id);
    if (patch.trunk_id !== undefined && patch.trunk_id !== existing.trunk_id) {
      await this.assertInboundTrunk(patch.trunk_id);
    }
    const merged = applyUpdate(existing, patch);
    await this.repo.replace(merged);
    return merged;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) {
      throw notFound(`Number ${id} not found`);
    }
  }
}
