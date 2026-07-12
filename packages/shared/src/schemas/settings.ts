// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

// Dashboard-configurable global options that persist across restarts. Backed by
// the `settings` key-value table (data-model.md). Environment values seed and
// override these on boot. The typed view here is the full settings object; the
// settings module (feature 25) reads and writes it.

export const SettingsSchema = z
  .object({
    record_all_calls: z
      .boolean()
      .default(false)
      .describe('When true, record every call by default (SWITCHBOARD_RECORD_ALL).'),
  })
  .describe('Global, persisted dashboard settings.');

/** PATCH /settings body: any subset of the settings. */
export const SettingsUpdateSchema = SettingsSchema.partial();

export type Settings = z.infer<typeof SettingsSchema>;
export type SettingsUpdate = z.input<typeof SettingsUpdateSchema>;

export const SETTINGS_EXAMPLE: Settings = {
  record_all_calls: false,
};
