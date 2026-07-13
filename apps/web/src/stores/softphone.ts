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
  /** The server's call id, correlated in once the event stream reports it. */
  id?: string;
}

/** How many recent destinations the dialler surfaces. */
export const MAX_RECENTS = 5;

/** Put `target` at the front of the recents list, de-duplicated and capped. */
export function withRecent(
  recents: readonly string[],
  target: string,
): string[] {
  return [target, ...recents.filter((entry) => entry !== target)].slice(
    0,
    MAX_RECENTS,
  );
}

interface SoftphoneState {
  registration: RegistrationStatus;
  callState: CallState;
  muted: boolean;
  held: boolean;
  recording: boolean;
  volume: number;
  codec: string | null;
  /** Epoch milliseconds when the active call connected, for the duration timer. */
  answeredAt: number | null;
  activeCall: ActiveCall | null;
  incoming: readonly IncomingCallInfo[];
  recents: readonly string[];
  adapter: SipAdapter;
  /** Injected at composition time to push a recording change to the server. */
  recordingControl: (id: string, enabled: boolean) => void;
}

interface SoftphoneActions {
  /** Wire the imperative SIP session. Done once at composition time. */
  attachAdapter: (adapter: SipAdapter) => void;
  /** Wire the server recording endpoint. Done once at composition time. */
  attachRecordingControl: (fn: (id: string, enabled: boolean) => void) => void;
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
  /** Remove a queued incoming call without rejecting it (e.g. caller cancelled). */
  removeIncoming: (id: string) => void;
  /** Accept a queued incoming call and move into it. */
  acceptIncoming: (id: string) => void;
  /** Correlate the server's call id onto the (single) active call, once known. */
  linkActiveCall: (id: string) => void;
  /** Reject a queued incoming call. */
  declineIncoming: (id: string) => void;
  /** Hang up the active call. */
  hangup: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  toggleRecording: () => void;
  setVolume: (volume: number) => void;
  /** Record the negotiated codec reported by the session or the event stream. */
  setCodec: (codec: string | null) => void;
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
  recording: false,
  volume: 1,
  codec: null,
  answeredAt: null,
  activeCall: null,
  incoming: [],
  recents: [],
  adapter: nullSipAdapter,
  recordingControl: () => {},
};

/** Fresh baseline state, used to reset the store (e.g. between tests). */
export function createInitialState(): SoftphoneState {
  return { ...initialState, incoming: [], recents: [] };
}

export const useSoftphoneStore = create<SoftphoneStore>((set, get) => ({
  ...createInitialState(),

  attachAdapter: (adapter) => {
    set({ adapter });
  },

  attachRecordingControl: (fn) => {
    set({ recordingControl: fn });
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
    set((state) => ({
      callState: 'calling',
      activeCall: { peer: target, direction: 'placed' },
      muted: false,
      held: false,
      recording: false,
      codec: null,
      answeredAt: null,
      recents: withRecent(state.recents, target),
    }));
  },

  outgoingRinging: () => {
    set({ callState: 'ringing' });
  },

  callAnswered: () => {
    set({ callState: 'in-call', answeredAt: Date.now() });
  },

  receiveIncoming: (info) => {
    set((state) => ({ incoming: [...state.incoming, info] }));
  },

  removeIncoming: (id) => {
    set((state) => ({
      incoming: state.incoming.filter((entry) => entry.id !== id),
    }));
  },

  acceptIncoming: (id) => {
    const info = get().incoming.find((entry) => entry.id === id);
    if (!info) {
      return;
    }
    get().adapter.answer(id);
    set((state) => ({
      callState: 'in-call',
      activeCall: { peer: info.from, direction: 'received', id: info.id },
      muted: false,
      held: false,
      recording: false,
      answeredAt: Date.now(),
      incoming: state.incoming.filter((entry) => entry.id !== id),
    }));
  },

  linkActiveCall: (id) => {
    const { activeCall } = get();
    if (activeCall && !activeCall.id) {
      set({ activeCall: { ...activeCall, id } });
    }
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

  toggleRecording: () => {
    const recording = !get().recording;
    set({ recording });
    const callId = get().activeCall?.id;
    if (callId) {
      get().recordingControl(callId, recording);
    }
  },

  setVolume: (volume) => {
    set({ volume });
  },

  setCodec: (codec) => {
    set({ codec });
  },

  sendDtmf: (digit) => {
    get().adapter.sendDtmf(digit);
  },

  reset: () => {
    set({
      callState: 'idle',
      muted: false,
      held: false,
      recording: false,
      codec: null,
      answeredAt: null,
      activeCall: null,
    });
  },
}));
