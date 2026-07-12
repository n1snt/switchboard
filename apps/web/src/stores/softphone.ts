// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import {
  nullSipAdapter,
  type IncomingCallInfo,
  type SipAdapter,
} from '@/features/softphone/adapter';

// The softphone session state machine. This holds all the call-control logic
// and is fully unit-tested against a fake adapter; the real SIP.js session is
// injected through `attachAdapter` at composition time. Keeping the imperative
// object behind the SipAdapter seam is what makes this store testable.

/** SIP registration status of the softphone. */
export type RegistrationStatus =
  'unregistered' | 'registering' | 'registered' | 'failed';

/** The lifecycle of the single active call. */
export type CallState = 'idle' | 'calling' | 'ringing' | 'in-call' | 'ended';

/** The direction of the active call, in the dashboard's plain language. */
export type CallDirection = 'placed' | 'received';

/** The party and direction of the active call. */
export interface ActiveCall {
  peer: string;
  direction: CallDirection;
}

interface SoftphoneState {
  registration: RegistrationStatus;
  callState: CallState;
  muted: boolean;
  held: boolean;
  activeCall: ActiveCall | null;
  incoming: readonly IncomingCallInfo[];
  adapter: SipAdapter;
}

interface SoftphoneActions {
  /** Wire the imperative SIP session. Done once at composition time. */
  attachAdapter: (adapter: SipAdapter) => void;
  /** Begin registration; the session reports the outcome via setRegistration. */
  register: () => void;
  setRegistration: (status: RegistrationStatus) => void;
  /** Place an outgoing call to a resolved target. */
  placeCall: (target: string) => void;
  /** The far end is ringing (SIP 180) on an outgoing call. */
  outgoingRinging: () => void;
  /** The active call connected (either direction). */
  callAnswered: () => void;
  /** Queue an incoming call surfaced by the session or the event stream. */
  receiveIncoming: (info: IncomingCallInfo) => void;
  /** Accept a queued incoming call and move into it. */
  acceptIncoming: (id: string) => void;
  /** Reject a queued incoming call. */
  declineIncoming: (id: string) => void;
  /** Hang up the active call. */
  hangup: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  sendDtmf: (digit: string) => void;
  /** Return to the idle baseline after a call ends. */
  reset: () => void;
}

export type SoftphoneStore = SoftphoneState & SoftphoneActions;

const initialState: SoftphoneState = {
  registration: 'unregistered',
  callState: 'idle',
  muted: false,
  held: false,
  activeCall: null,
  incoming: [],
  adapter: nullSipAdapter,
};

/** Fresh baseline state, used to reset the store (e.g. between tests). */
export function createInitialState(): SoftphoneState {
  return { ...initialState, incoming: [] };
}

export const useSoftphoneStore = create<SoftphoneStore>((set, get) => ({
  ...createInitialState(),

  attachAdapter: (adapter) => {
    set({ adapter });
  },

  register: () => {
    get().adapter.register();
    set({ registration: 'registering' });
  },

  setRegistration: (status) => {
    set({ registration: status });
  },

  placeCall: (target) => {
    get().adapter.call(target);
    set({
      callState: 'calling',
      activeCall: { peer: target, direction: 'placed' },
      muted: false,
      held: false,
    });
  },

  outgoingRinging: () => {
    set({ callState: 'ringing' });
  },

  callAnswered: () => {
    set({ callState: 'in-call' });
  },

  receiveIncoming: (info) => {
    set((state) => ({ incoming: [...state.incoming, info] }));
  },

  acceptIncoming: (id) => {
    const info = get().incoming.find((entry) => entry.id === id);
    if (!info) {
      return;
    }
    get().adapter.answer(id);
    set((state) => ({
      callState: 'in-call',
      activeCall: { peer: info.from, direction: 'received' },
      muted: false,
      held: false,
      incoming: state.incoming.filter((entry) => entry.id !== id),
    }));
  },

  declineIncoming: (id) => {
    get().adapter.decline(id);
    set((state) => ({
      incoming: state.incoming.filter((entry) => entry.id !== id),
    }));
  },

  hangup: () => {
    get().adapter.hangup();
    set({ callState: 'ended' });
  },

  toggleMute: () => {
    const muted = !get().muted;
    get().adapter.mute(muted);
    set({ muted });
  },

  toggleHold: () => {
    const held = !get().held;
    get().adapter.hold(held);
    set({ held });
  },

  sendDtmf: (digit) => {
    get().adapter.sendDtmf(digit);
  },

  reset: () => {
    set({
      callState: 'idle',
      muted: false,
      held: false,
      activeCall: null,
    });
  },
}));
