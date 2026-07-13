// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { SoftphoneStore } from '@/stores/softphone';
import type { SipAdapter } from './adapter';

// Connects an imperative SIP session to the softphone store: attach it, forward
// its lifecycle back into the store, and register. The incoming-call card is
// driven by the server event stream (features/softphone/call-events.ts), not by
// the session, so this deliberately does not wire onIncoming — the session only
// receives and answers the media for those calls. Kept pure over the injected
// adapter and store slice so it is testable; the real session is built in main.tsx.

/** The store actions the session drives. */
export type SessionStore = Pick<
  SoftphoneStore,
  'attachAdapter' | 'register' | 'setRegistration' | 'callAnswered' | 'reset'
>;

export function attachSoftphoneSession(
  adapter: SipAdapter,
  store: SessionStore,
): void {
  store.attachAdapter(adapter);
  adapter.onRegistrationChange((status) => {
    store.setRegistration(status);
  });
  adapter.onEstablished(() => {
    store.callAnswered();
  });
  adapter.onEnded(() => {
    store.reset();
  });
  store.register();
}
