// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import SqliteDatabase from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import type { Database } from './schema';

/** A Kysely instance bound to the Switchboard SQLite schema. */
export type Db = Kysely<Database>;

/**
 * Open the SQLite database at `path` (`:memory:` for tests), set the pragmatic
 * pragmas, and construct the typed Kysely instance handed to repositories. The
 * server (feature 4) is the only writer to this file.
 */
export function createDb(path: string): Db {
  const sqlite = new SqliteDatabase(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return new Kysely<Database>({ dialect: new SqliteDialect({ database: sqlite }) });
}
