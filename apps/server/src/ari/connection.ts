// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Client } from 'ari-client';
import type { EngineStatus } from '@switchboard/shared';
import type { Logger } from '../logger';

// Owns the ARI connection lifecycle: connect (retrying at boot in case the engine
// starts a moment later), join the Stasis application, register handlers, and
// reflect the connection state for the health endpoint. ari-client handles
// reconnection after a drop internally; we mirror its WebSocket events into the
// engine status.

export type AriConnector = () => Promise<Client>;

/** Build the per-event handlers once a client is connected. */
export type OnConnect = (client: Client) => Record<string, (payload: unknown) => void>;

export interface AriConnectionDeps {
  connect: AriConnector;
  appName: string;
  logger: Logger;
  onConnect: OnConnect;
  retryBaseMs?: number;
  retryMaxMs?: number;
  /** Injectable timer for deterministic tests; defaults to setTimeout. */
  schedule?: (callback: () => void, ms: number) => void;
}

export class AriConnection {
  private status: EngineStatus = 'disconnected';
  private stopped = false;
  private readonly connect: AriConnector;
  private readonly appName: string;
  private readonly logger: Logger;
  private readonly onConnect: OnConnect;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;
  private readonly schedule: (callback: () => void, ms: number) => void;
  private client?: Client;

  constructor(deps: AriConnectionDeps) {
    this.connect = deps.connect;
    this.appName = deps.appName;
    this.logger = deps.logger;
    this.onConnect = deps.onConnect;
    this.retryBaseMs = deps.retryBaseMs ?? 1000;
    this.retryMaxMs = deps.retryMaxMs ?? 30000;
    this.schedule =
      deps.schedule ??
      ((callback, ms): void => {
        setTimeout(callback, ms).unref();
      });
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  /** Begin connecting; retries with capped backoff until it succeeds or stops. */
  async start(): Promise<void> {
    this.status = 'connecting';
    await this.attempt(0);
  }

  /** Stop the connection and leave the Stasis application. */
  stop(): void {
    this.stopped = true;
    this.client?.stop();
    this.status = 'disconnected';
  }

  private async attempt(retry: number): Promise<void> {
    try {
      const client = await this.connect();
      this.client = client;
      this.wire(client);
      client.start(this.appName);
      this.status = 'connected';
      this.logger.info(`ari: connected and joined Stasis app "${this.appName}"`);
    } catch (err) {
      this.logger.warn(`ari: connect failed: ${String(err)}`);
      if (this.stopped) {
        return;
      }
      const delay = Math.min(this.retryBaseMs * 2 ** retry, this.retryMaxMs);
      this.schedule(() => {
        void this.attempt(retry + 1);
      }, delay);
    }
  }

  private wire(client: Client): void {
    client.on('WebSocketConnected', () => {
      this.status = 'connected';
    });
    client.on('WebSocketReconnecting', () => {
      this.status = 'connecting';
    });
    client.on('WebSocketMaxRetries', () => {
      this.status = 'disconnected';
    });

    for (const [type, handler] of Object.entries(this.onConnect(client))) {
      client.on(type, (payload) => {
        handler(payload);
      });
    }
  }
}
