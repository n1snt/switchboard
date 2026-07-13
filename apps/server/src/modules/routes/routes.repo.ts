// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Route, RouteDirection } from '@switchboard/shared';
import type { Db } from '../../db';
import type { RoutesTable } from '../../db/schema';

function rowToRoute(row: RoutesTable): Route {
  return {
    id: row.id,
    direction: row.direction as RouteDirection,
    match: row.match,
    destination: row.destination,
    priority: row.priority,
  };
}

export class RouteRepo {
  constructor(private readonly db: Db) {}

  async list(): Promise<Route[]> {
    const rows = await this.db
      .selectFrom('routes')
      .selectAll()
      .orderBy('priority')
      .execute();
    return rows.map(rowToRoute);
  }

  async get(id: string): Promise<Route | undefined> {
    const row = await this.db
      .selectFrom('routes')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? rowToRoute(row) : undefined;
  }

  async insert(route: Route): Promise<void> {
    await this.db.insertInto('routes').values(route).execute();
  }

  async replace(route: Route): Promise<void> {
    const { id, ...rest } = route;
    await this.db
      .updateTable('routes')
      .set(rest)
      .where('id', '=', id)
      .execute();
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('routes')
      .where('id', '=', id)
      .executeTakeFirst();
    return result.numDeletedRows > 0n;
  }
}
