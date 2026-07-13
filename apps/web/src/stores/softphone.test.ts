// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  nullSipAdapter,
  type IncomingCallInfo,
  type SipAdapter,
} from '@/features/softphone/adapter';
import {
  createInitialState,
  MAX_RECENTS,
  useSoftphoneStore,
  withRecent,
  type SoftphoneStore,
} from './softphone';

function makeFakeAdapter(): SipAdapter {
  return {
    register: vi.fn(),
    unregister: vi.fn(),
    call: vi.fn(),
    answer: vi.fn(),
    decline: vi.fn(),
    hangup: vi.fn(),
    mute: vi.fn(),
    hold: vi.fn(),
    sendDtmf: vi.fn(),
    onIncoming: vi.fn(),
    onRegistrationChange: vi.fn(),
    onEstablished: vi.fn(),
    onEnded: vi.fn(),
    attachMedia: vi.fn(),
  };
}

const incoming: IncomingCallInfo = {
  id: 'in-1',
  from: '+14155550123',
  via: 'carrier-sim',
};

function store(): SoftphoneStore {
  return useSoftphoneStore.getState();
}

beforeEach(() => {
  useSoftphoneStore.setState(createInitialState());
});

describe('createInitialState', () => {
  it('is the idle baseline with the null adapter', () => {
    expect(createInitialState()).toEqual({
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
      recordingControl: expect.any(Function),
    });
  });
});

describe('withRecent', () => {
  it('puts the target first, de-duplicates, and caps the list', () => {
    expect(withRecent([], 'a')).toEqual(['a']);
    expect(withRecent(['a', 'b'], 'b')).toEqual(['b', 'a']);
    const many = Array.from({ length: MAX_RECENTS }, (_, i) => `n${String(i)}`);
    const result = withRecent(many, 'new');
    expect(result).toHaveLength(MAX_RECENTS);
    expect(result[0]).toBe('new');
  });
});

describe('nullSipAdapter', () => {
  it('exposes no-op methods that never throw', () => {
    expect(() => {
      nullSipAdapter.register();
      nullSipAdapter.unregister();
      nullSipAdapter.call('agent-dev');
      nullSipAdapter.answer('in-1');
      nullSipAdapter.decline('in-1');
      nullSipAdapter.hangup();
      nullSipAdapter.mute(true);
      nullSipAdapter.hold(true);
      nullSipAdapter.sendDtmf('1');
      nullSipAdapter.onIncoming(() => {});
      nullSipAdapter.onRegistrationChange(() => {});
      nullSipAdapter.onEstablished(() => {});
      nullSipAdapter.onEnded(() => {});
      nullSipAdapter.attachMedia(null, null);
    }).not.toThrow();
  });
});

describe('softphone store with the default null adapter', () => {
  it('drives the outgoing lifecycle idle -> calling -> ringing -> in-call -> ended -> idle', () => {
    store().placeCall('agent-dev');
    expect(store().callState).toBe('calling');
    expect(store().activeCall).toEqual({
      peer: 'agent-dev',
      direction: 'placed',
    });

    store().outgoingRinging();
    expect(store().callState).toBe('ringing');

    store().callAnswered();
    expect(store().callState).toBe('in-call');

    store().hangup();
    expect(store().callState).toBe('ended');

    store().reset();
    expect(store().callState).toBe('idle');
    expect(store().activeCall).toBeNull();
  });

  it('registers, queues and accepts an incoming call', () => {
    store().register();
    expect(store().registration).toBe('registering');
    store().setRegistration('registered');
    expect(store().registration).toBe('registered');

    store().receiveIncoming(incoming);
    expect(store().incoming).toEqual([incoming]);

    store().acceptIncoming('in-1');
    expect(store().callState).toBe('in-call');
    expect(store().activeCall).toEqual({
      peer: '+14155550123',
      direction: 'received',
      id: 'in-1',
    });
    expect(store().incoming).toEqual([]);
  });

  it('declines a queued incoming call', () => {
    store().receiveIncoming(incoming);
    store().declineIncoming('in-1');
    expect(store().incoming).toEqual([]);
  });

  it('ignores accepting an unknown incoming id', () => {
    store().receiveIncoming(incoming);
    store().acceptIncoming('does-not-exist');
    expect(store().callState).toBe('idle');
    expect(store().incoming).toEqual([incoming]);
  });

  it('toggles mute and hold and sends DTMF without throwing', () => {
    store().toggleMute();
    expect(store().muted).toBe(true);
    store().toggleMute();
    expect(store().muted).toBe(false);

    store().toggleHold();
    expect(store().held).toBe(true);
    store().toggleHold();
    expect(store().held).toBe(false);

    expect(() => {
      store().sendDtmf('5');
    }).not.toThrow();
  });
});

describe('softphone store with an adapter attached', () => {
  let adapter: SipAdapter;

  beforeEach(() => {
    adapter = makeFakeAdapter();
    store().attachAdapter(adapter);
  });

  it('forwards session intent to the adapter', () => {
    store().register();
    expect(adapter.register).toHaveBeenCalledOnce();

    store().placeCall('agent-dev');
    expect(adapter.call).toHaveBeenCalledWith('agent-dev');

    store().hangup();
    expect(adapter.hangup).toHaveBeenCalledOnce();

    store().toggleMute();
    expect(adapter.mute).toHaveBeenCalledWith(true);

    store().toggleHold();
    expect(adapter.hold).toHaveBeenCalledWith(true);

    store().sendDtmf('#');
    expect(adapter.sendDtmf).toHaveBeenCalledWith('#');
  });

  it('answers an accepted incoming call through the adapter', () => {
    store().receiveIncoming(incoming);
    store().acceptIncoming('in-1');
    expect(adapter.answer).toHaveBeenCalledWith('in-1');
  });

  it('declines through the adapter', () => {
    store().receiveIncoming(incoming);
    store().declineIncoming('in-1');
    expect(adapter.decline).toHaveBeenCalledWith('in-1');
  });
});

describe('softphone extended call controls', () => {
  it('tracks recents and resets per-call state when placing a call', () => {
    store().setCodec('ulaw');
    store().toggleRecording();
    store().placeCall('carrier-sim');
    store().placeCall('agent-dev');
    expect(store().recents).toEqual(['agent-dev', 'carrier-sim']);
    expect(store().codec).toBeNull();
    expect(store().recording).toBe(false);
    expect(store().answeredAt).toBeNull();
  });

  it('stamps answeredAt when the call connects', () => {
    store().callAnswered();
    expect(store().callState).toBe('in-call');
    expect(typeof store().answeredAt).toBe('number');
  });

  it('stamps answeredAt when accepting an incoming call', () => {
    store().receiveIncoming(incoming);
    store().acceptIncoming('in-1');
    expect(typeof store().answeredAt).toBe('number');
  });

  it('removes an incoming call without declining it', () => {
    store().receiveIncoming(incoming);
    store().removeIncoming('in-1');
    expect(store().incoming).toEqual([]);
  });

  it('toggles recording, sets volume and codec', () => {
    store().toggleRecording();
    expect(store().recording).toBe(true);
    store().toggleRecording();
    expect(store().recording).toBe(false);

    store().setVolume(0.4);
    expect(store().volume).toBe(0.4);

    store().setCodec('opus');
    expect(store().codec).toBe('opus');
    store().setCodec(null);
    expect(store().codec).toBeNull();
  });

  it('does not push a recording change when the active call has no server id', () => {
    const recordingControl = vi.fn();
    store().attachRecordingControl(recordingControl);
    store().placeCall('agent-dev');

    store().toggleRecording();
    expect(store().recording).toBe(true);
    expect(recordingControl).not.toHaveBeenCalled();
  });

  it('defaults recordingControl to a no-op before a control is attached', () => {
    store().placeCall('agent-dev');
    store().linkActiveCall('call_1');
    expect(() => {
      store().toggleRecording();
    }).not.toThrow();
  });

  it('pushes a recording change to the server once the active call is linked', () => {
    const recordingControl = vi.fn();
    store().attachRecordingControl(recordingControl);
    store().placeCall('agent-dev');
    store().linkActiveCall('call_1');

    store().toggleRecording();
    expect(store().recording).toBe(true);
    expect(recordingControl).toHaveBeenCalledWith('call_1', true);

    store().toggleRecording();
    expect(store().recording).toBe(false);
    expect(recordingControl).toHaveBeenCalledWith('call_1', false);
  });

  it('links the server call id onto the active call only once', () => {
    store().placeCall('agent-dev');
    store().linkActiveCall('call_1');
    expect(store().activeCall?.id).toBe('call_1');

    store().linkActiveCall('call_2');
    expect(store().activeCall?.id).toBe('call_1');
  });

  it('does nothing when linking a call id with no active call', () => {
    store().linkActiveCall('call_1');
    expect(store().activeCall).toBeNull();
  });
});
