// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { nullSipAdapter, type SipAdapter } from './adapter';
import { attachSoftphoneSession, type SessionStore } from './session';

function makeStore(): SessionStore {
  return {
    attachAdapter: vi.fn(),
    register: vi.fn(),
    setRegistration: vi.fn(),
    callAnswered: vi.fn(),
    reset: vi.fn(),
  };
}

describe('attachSoftphoneSession', () => {
  it('attaches the adapter and registers', () => {
    const store = makeStore();
    attachSoftphoneSession({ ...nullSipAdapter }, store);
    expect(store.attachAdapter).toHaveBeenCalledOnce();
    expect(store.register).toHaveBeenCalledOnce();
  });

  it('forwards the session lifecycle into the store', () => {
    const store = makeStore();
    const callbacks: {
      registration?: (status: 'registered' | 'unregistered' | 'failed') => void;
      established?: () => void;
      ended?: () => void;
    } = {};
    const adapter: SipAdapter = {
      ...nullSipAdapter,
      onRegistrationChange: (cb) => {
        callbacks.registration = cb;
      },
      onEstablished: (cb) => {
        callbacks.established = cb;
      },
      onEnded: (cb) => {
        callbacks.ended = cb;
      },
    };

    attachSoftphoneSession(adapter, store);

    callbacks.registration?.('registered');
    expect(store.setRegistration).toHaveBeenCalledWith('registered');

    callbacks.established?.();
    expect(store.callAnswered).toHaveBeenCalledOnce();

    callbacks.ended?.();
    expect(store.reset).toHaveBeenCalledOnce();
  });
});
