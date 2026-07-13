// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

// The seam between the softphone store (pure, testable state logic) and the
// imperative SIP.js session (a browser/media object that cannot be unit tested).
// The store depends only on this interface, so tests drive it with a fake and
// the real SIP.js implementation stays isolated in sipjsAdapter.ts.

/** What we know about a call arriving at the softphone. */
export interface IncomingCallInfo {
  /** Stable id for this incoming call within the session. */
  id: string;
  /** The calling number or SIP URI. */
  from: string;
  /** The trunk or route the call arrived on, for display. */
  via: string;
}

/** SIP registration outcomes the session reports back. A subset of the store's
 * RegistrationStatus (which also has the transient `registering`). */
export type SipRegistrationState = 'registered' | 'unregistered' | 'failed';

/**
 * The imperative operations the store issues against the SIP session. Every
 * method returns void: the store fires and forgets, and the session reports
 * progress back through the store's own actions (wired at composition time).
 */
export interface SipAdapter {
  register(): void;
  unregister(): void;
  call(target: string): void;
  answer(id: string): void;
  decline(id: string): void;
  hangup(): void;
  mute(muted: boolean): void;
  hold(held: boolean): void;
  sendDtmf(digit: string): void;
  /** Register a callback invoked when a call arrives. */
  onIncoming(callback: (info: IncomingCallInfo) => void): void;
  /** Register a callback invoked when the registration state changes. */
  onRegistrationChange(callback: (status: SipRegistrationState) => void): void;
  /** Register a callback invoked when the active call connects. */
  onEstablished(callback: () => void): void;
  /** Register a callback invoked when the active call ends (remote hangup/failure). */
  onEnded(callback: () => void): void;
  /** Attach the local and remote media streams to audio elements. */
  attachMedia(
    local: HTMLAudioElement | null,
    remote: HTMLAudioElement | null,
  ): void;
}

/**
 * A do-nothing adapter used as the store's default before a real SIP session is
 * wired in at composition time. Every method is a no-op, so store logic can run
 * (and be tested) without a live session and without null checks.
 */
export const nullSipAdapter: SipAdapter = {
  register: () => {},
  unregister: () => {},
  call: () => {},
  answer: () => {},
  decline: () => {},
  hangup: () => {},
  mute: () => {},
  hold: () => {},
  sendDtmf: () => {},
  onIncoming: () => {},
  onRegistrationChange: () => {},
  onEstablished: () => {},
  onEnded: () => {},
  attachMedia: () => {},
};
