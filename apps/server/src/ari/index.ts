// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { EventBus } from '../events/bus';
import type { Logger } from '../logger';
import { AriConnection, type AriConnector } from './connection';
import { CallCoordinator, type CallDirectory } from './coordinator';
import { createAriOperations } from './operations';

export { AriConnection } from './connection';
export type { AriConnector } from './connection';
export type { CallDirectory } from './coordinator';
export { realConnector } from './connect';

export interface CreateAriOptions {
  connect: AriConnector;
  appName: string;
  bus: EventBus;
  logger: Logger;
  directory: CallDirectory;
  now?: () => string;
  idGen?: () => string;
}

/**
 * Wire an ARI connection to the call coordinator: once connected, build the ARI
 * operations wrapper and a coordinator whose handlers are registered on the
 * client. This is the composition point the server boots.
 */
export function createAri(options: CreateAriOptions): AriConnection {
  return new AriConnection({
    connect: options.connect,
    appName: options.appName,
    logger: options.logger,
    onConnect: (client) => {
      const ops = createAriOperations(client);
      const coordinator = new CallCoordinator({
        ops,
        bus: options.bus,
        appName: options.appName,
        logger: options.logger,
        directory: options.directory,
        ...(options.now ? { now: options.now } : {}),
        ...(options.idGen ? { idGen: options.idGen } : {}),
      });
      return coordinator.handlers();
    },
  });
}
