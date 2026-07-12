// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Client } from 'ari-client';

// A small typed wrapper over the ARI operations the call features use. The rest
// of the server depends on this interface, never on `ari-client` directly, so the
// call logic (coordinator.ts) is testable with a plain mock.

export interface OriginateParams {
  /** Asterisk endpoint, e.g. `PJSIP/1001`. */
  endpoint: string;
  /** Stasis application to drop the new channel into. */
  app: string;
  /** Arguments passed to the Stasis application (joined with commas on the wire). */
  appArgs: string[];
  /** Optional caller identity presented to the far end. */
  callerId?: string;
}

export interface AriOperations {
  answer(channelId: string): Promise<void>;
  hangup(channelId: string): Promise<void>;
  createBridge(): Promise<string>;
  destroyBridge(bridgeId: string): Promise<void>;
  addToBridge(bridgeId: string, channelId: string): Promise<void>;
  /** Originate a channel and return its id. */
  originate(params: OriginateParams): Promise<string>;
}

/** Adapt a connected `ari-client` instance to the {@link AriOperations} surface. */
export function createAriOperations(client: Client): AriOperations {
  return {
    async answer(channelId) {
      await client.channels.answer({ channelId });
    },
    async hangup(channelId) {
      await client.channels.hangup({ channelId });
    },
    async createBridge() {
      const bridge = await client.bridges.create({ type: 'mixing' });
      return bridge.id;
    },
    async destroyBridge(bridgeId) {
      await client.bridges.destroy({ bridgeId });
    },
    async addToBridge(bridgeId, channel) {
      await client.bridges.addChannel({ bridgeId, channel });
    },
    async originate(params) {
      const channel = await client.channels.originate({
        endpoint: params.endpoint,
        app: params.app,
        appArgs: params.appArgs.join(','),
        ...(params.callerId === undefined ? {} : { callerId: params.callerId }),
      });
      return channel.id;
    },
  };
}
