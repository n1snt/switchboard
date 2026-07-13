// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Kysely } from 'kysely';
import type { Database } from '../schema';
import { up as init } from './0001_init';
import { up as pjsipRealtime } from './0002_pjsip_realtime';
import { up as pjsipIdentify } from './0003_pjsip_identify';

/** A single ordered, forward-only migration. */
export interface Migration {
  name: string;
  up: (db: Kysely<Database>) => Promise<void>;
}

/**
 * All migrations in application order. Append new ones; never edit an applied
 * migration, since they run once and are tracked by name.
 */
export const migrations: Migration[] = [
  { name: '0001_init', up: init },
  { name: '0002_pjsip_realtime', up: pjsipRealtime },
  { name: '0003_pjsip_identify', up: pjsipIdentify },
];
