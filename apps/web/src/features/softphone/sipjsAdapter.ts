// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

/* v8 ignore start -- real SIP.js/WebRTC session: a browser+media seam with no
   deterministic unit surface. It is pure glue over Web.SimpleUser; the tested
   logic lives in the softphone store and session wiring, which depend only on
   the SipAdapter interface. Proven by a real call against a running engine, not
   by coverage. The start/stop form is matched against the raw source, so it
   survives the esbuild transform that strips a plain `v8 ignore file` comment. */

import { Web } from 'sip.js';
import type {
  IncomingCallInfo,
  SipAdapter,
  SipRegistrationState,
} from './adapter';

/** What the real adapter needs from the environment to open a session. */
export interface SipjsAdapterConfig {
  /** The engine's SIP-over-WebSocket endpoint, e.g. ws://localhost:8088/ws. */
  server: string;
  /** The softphone's SIP Address of Record, e.g. sip:1001@localhost. */
  aor: string;
  /** SIP domain used to build a request URI from a bare dialled string. */
  domain: string;
  authorizationUsername: string;
  authorizationPassword: string;
  displayName: string;
  /** The <audio> element the remote stream is attached to. */
  remoteAudio: HTMLAudioElement;
}

/** Fire-and-forget a SIP.js promise, surfacing failures without crashing. */
function run(action: Promise<void>): void {
  action.catch((error: unknown) => {
    console.error('softphone SIP action failed', error);
  });
}

/**
 * The production SipAdapter, backed by SIP.js's high-level SimpleUser. It maps
 * the store's intent onto the imperative session and forwards the session's
 * registration and call lifecycle back through the interface callbacks.
 * SimpleUser handles a single call at a time, so the `id` arguments from the
 * interface are not needed by the session itself.
 */
export class SipjsAdapter implements SipAdapter {
  private readonly user: Web.SimpleUser;
  private readonly domain: string;
  private onIncomingCallback: ((info: IncomingCallInfo) => void) | null = null;
  private onRegistrationCallback:
    ((status: SipRegistrationState) => void) | null = null;
  private onEstablishedCallback: (() => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private incomingCounter = 0;

  constructor(config: SipjsAdapterConfig) {
    this.domain = config.domain;
    this.user = new Web.SimpleUser(config.server, {
      aor: config.aor,
      media: { remote: { audio: config.remoteAudio } },
      userAgentOptions: {
        displayName: config.displayName,
        authorizationUsername: config.authorizationUsername,
        authorizationPassword: config.authorizationPassword,
      },
      delegate: {
        onServerDisconnect: () => this.onRegistrationCallback?.('failed'),
        onRegistered: () => this.onRegistrationCallback?.('registered'),
        onUnregistered: () => this.onRegistrationCallback?.('unregistered'),
        onCallReceived: () => {
          this.incomingCounter += 1;
          this.onIncomingCallback?.({
            id: `incoming-${String(this.incomingCounter)}`,
            from: 'unknown',
            via: config.aor,
          });
        },
        onCallAnswered: () => this.onEstablishedCallback?.(),
        onCallHangup: () => this.onEndedCallback?.(),
      },
    });
  }

  register(): void {
    run(this.user.connect().then(() => this.user.register()));
  }

  unregister(): void {
    run(this.user.unregister());
  }

  call(target: string): void {
    const uri = target.startsWith('sip:')
      ? target
      : `sip:${target}@${this.domain}`;
    run(this.user.call(uri));
  }

  answer(): void {
    run(this.user.answer());
  }

  decline(): void {
    run(this.user.decline());
  }

  hangup(): void {
    run(this.user.hangup());
  }

  mute(muted: boolean): void {
    if (muted) {
      this.user.mute();
    } else {
      this.user.unmute();
    }
  }

  hold(held: boolean): void {
    run(held ? this.user.hold() : this.user.unhold());
  }

  sendDtmf(digit: string): void {
    run(this.user.sendDTMF(digit));
  }

  onIncoming(callback: (info: IncomingCallInfo) => void): void {
    this.onIncomingCallback = callback;
  }

  onRegistrationChange(callback: (status: SipRegistrationState) => void): void {
    this.onRegistrationCallback = callback;
  }

  onEstablished(callback: () => void): void {
    this.onEstablishedCallback = callback;
  }

  onEnded(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  attachMedia(): void {
    // SimpleUser attaches the remote stream to the element passed at
    // construction; nothing further is required here.
  }
}

/* v8 ignore stop */
