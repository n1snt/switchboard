// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

// Minimal ambient types for the untyped `ari-client` package, covering only the
// surface Switchboard uses. Event payloads are typed `unknown` on purpose: every
// ARI event is validated with Zod at the boundary (ari/events.ts) before use.
declare module 'ari-client' {
  export interface Channel {
    id: string;
  }

  export interface Bridge {
    id: string;
  }

  export interface Channels {
    answer(params: { channelId: string }): Promise<void>;
    hangup(params: { channelId: string }): Promise<void>;
    originate(params: {
      endpoint: string;
      app: string;
      appArgs?: string;
      callerId?: string;
    }): Promise<Channel>;
    getChannelVar(params: {
      channelId: string;
      variable: string;
    }): Promise<{ value: string }>;
  }

  export interface Bridges {
    create(params: { type: string }): Promise<Bridge>;
    destroy(params: { bridgeId: string }): Promise<void>;
    addChannel(params: { bridgeId: string; channel: string }): Promise<void>;
    record(params: {
      bridgeId: string;
      name: string;
      format: string;
    }): Promise<{ name: string }>;
  }

  export interface Recordings {
    stop(params: { recordingName: string }): Promise<void>;
  }

  export type AriEventListener = (...args: unknown[]) => void;

  export interface Client {
    on(event: string, listener: AriEventListener): void;
    removeListener(event: string, listener: AriEventListener): void;
    start(apps: string): void;
    stop(): void;
    channels: Channels;
    bridges: Bridges;
    recordings: Recordings;
  }

  export function connect(
    url: string,
    username: string,
    password: string,
  ): Promise<Client>;

  const client: { connect: typeof connect };
  export default client;
}
