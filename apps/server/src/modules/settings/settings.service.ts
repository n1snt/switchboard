// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { SettingsSchema } from '@switchboard/shared';
import type { Settings, SettingsUpdate } from '@switchboard/shared';
import type { SettingsRepo } from './settings.repo';

// Reads and writes the global settings. Missing keys fall back to the schema
// defaults, so a fresh instance reads sensible values with no rows written.
export class SettingsService {
  constructor(private readonly repo: SettingsRepo) {}

  async get(): Promise<Settings> {
    return SettingsSchema.parse(await this.repo.getAll());
  }

  async update(patch: SettingsUpdate): Promise<Settings> {
    if (patch.record_all_calls !== undefined) {
      await this.repo.set('record_all_calls', patch.record_all_calls);
    }
    return this.get();
  }

  /**
   * Environment values seed and override settings on boot (data-model.md). Only
   * applies when the variable was explicitly set, so a dashboard change persists
   * across restarts when the environment does not pin the value.
   */
  async seedRecordAll(value: boolean | undefined): Promise<void> {
    if (value !== undefined) {
      await this.repo.set('record_all_calls', value);
    }
  }
}
