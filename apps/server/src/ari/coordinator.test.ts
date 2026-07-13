// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CallEvent } from '@switchboard/shared';
import { NUMBER_EXAMPLE, TRUNK_EXAMPLE } from '@switchboard/shared';
import { EventBus } from '../events/bus';
import type { Logger } from '../logger';
import { CallCoordinator, type CallDirectory } from './coordinator';
import type { AriOperations } from './operations';

function makeOps(overrides: Partial<AriOperations> = {}): AriOperations {
  return {
    answer: vi.fn().mockResolvedValue(undefined),
    hangup: vi.fn().mockResolvedValue(undefined),
    createBridge: vi.fn().mockResolvedValue('bridge-1'),
    destroyBridge: vi.fn().mockResolvedValue(undefined),
    addToBridge: vi.fn().mockResolvedValue(undefined),
    originate: vi.fn().mockResolvedValue('callee-1'),
    startBridgeRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeDirectory(overrides: Partial<CallDirectory> = {}): CallDirectory {
  return {
    trunks: vi.fn().mockResolvedValue([]),
    numbers: vi.fn().mockResolvedValue([]),
    routes: vi.fn().mockResolvedValue([]),
    recordAll: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

const logger: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const flush = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

let ops: AriOperations;
let bus: EventBus;
let events: CallEvent[];

function coordinator(
  customOps: AriOperations = ops,
  directory: CallDirectory = makeDirectory(),
): CallCoordinator {
  return new CallCoordinator({
    ops: customOps,
    bus,
    appName: 'switchboard',
    logger,
    directory,
    now: () => '2026-07-13T10:00:00.000Z',
    idGen: () => 'call-1',
  });
}

// A softphone placing a call to another browser extension (walking skeleton).
const softphoneCaller = {
  type: 'StasisStart' as const,
  args: [] as string[],
  channel: {
    id: 'caller-1',
    name: 'PJSIP/1001-00000001',
    dialplan: { exten: '1002' },
    caller: { number: '1001' },
  },
};

const calleeEntered = {
  type: 'StasisStart' as const,
  args: ['dialed', 'bridge-1'],
  channel: { id: 'callee-1' },
};

beforeEach(() => {
  vi.clearAllMocks();
  ops = makeOps();
  bus = new EventBus();
  events = [];
  bus.subscribe((event) => events.push(event));
});

describe('CallCoordinator — softphone caller (inbound)', () => {
  it('bridges a browser-to-browser call and ends it', async () => {
    const coord = coordinator();

    await coord.onStasisStart(softphoneCaller);
    expect(ops.answer).toHaveBeenCalledWith('caller-1');
    expect(ops.createBridge).toHaveBeenCalledOnce();
    expect(ops.addToBridge).toHaveBeenCalledWith('bridge-1', 'caller-1');
    expect(ops.originate).toHaveBeenCalledWith({
      endpoint: 'PJSIP/1002',
      app: 'switchboard',
      appArgs: ['dialed', 'bridge-1'],
      callerId: '1001',
    });
    expect(events.map((e) => e.type)).toEqual(['call.created', 'call.ringing']);
    expect(events[0]?.call).toMatchObject({
      direction: 'inbound',
      from_number: '1001',
      to_number: '1002',
      trunk_id: null,
    });

    await coord.onStasisStart(calleeEntered);
    expect(ops.answer).toHaveBeenCalledWith('callee-1');
    expect(ops.addToBridge).toHaveBeenCalledWith('bridge-1', 'callee-1');
    expect(ops.startBridgeRecording).not.toHaveBeenCalled();
    expect(events.at(-1)?.type).toBe('call.answered');
    expect(events.at(-1)?.call.answered_at).toBe('2026-07-13T10:00:00.000Z');

    await coord.onHangup('caller-1', 'normal');
    expect(ops.destroyBridge).toHaveBeenCalledWith('bridge-1');
    expect(ops.hangup).toHaveBeenCalledWith('callee-1');
    expect(events.at(-1)?.call.state).toBe('ended');
    expect(events.at(-1)?.call.hangup_cause).toBe('normal');
  });

  it('routes a saved number through its trunk', async () => {
    const directory = makeDirectory({
      numbers: vi.fn().mockResolvedValue([NUMBER_EXAMPLE]),
      trunks: vi.fn().mockResolvedValue([TRUNK_EXAMPLE]),
    });
    const coord = coordinator(ops, directory);
    await coord.onStasisStart({
      ...softphoneCaller,
      channel: {
        ...softphoneCaller.channel,
        dialplan: { exten: NUMBER_EXAMPLE.e164 },
      },
    });
    expect(ops.originate).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: `PJSIP/${NUMBER_EXAMPLE.e164}@${TRUNK_EXAMPLE.id}`,
      }),
    );
    expect(events[0]?.call).toMatchObject({
      direction: 'inbound',
      to_number: NUMBER_EXAMPLE.e164,
      trunk_id: TRUNK_EXAMPLE.id,
    });
  });

  it('falls back to a real clock and id generator', async () => {
    const coord = new CallCoordinator({
      ops,
      bus,
      appName: 'switchboard',
      logger,
      directory: makeDirectory(),
    });
    await coord.onStasisStart(softphoneCaller);
    expect(events[0]?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(events[0]?.call.id).toMatch(/\w+/);
  });

  it('uses the channel id as the caller number when none is present', async () => {
    const coord = coordinator();
    await coord.onStasisStart({
      type: 'StasisStart',
      args: [],
      channel: { id: 'caller-9', dialplan: { exten: '1002' } },
    });
    expect(events[0]?.call.from_number).toBe('caller-9');
  });
});

describe('CallCoordinator — trunk caller (outbound, feature 16)', () => {
  it('rings the softphone for a call arriving on a trunk', async () => {
    const directory = makeDirectory({
      trunks: vi.fn().mockResolvedValue([TRUNK_EXAMPLE]),
    });
    const coord = coordinator(ops, directory);
    await coord.onStasisStart({
      type: 'StasisStart',
      args: [],
      channel: {
        id: 'caller-1',
        name: `PJSIP/${TRUNK_EXAMPLE.id}-00000001`,
        dialplan: { exten: '5551000' },
        caller: { number: 'sut-caller' },
      },
    });
    expect(ops.originate).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'PJSIP/1001' }),
    );
    expect(events[0]?.call).toMatchObject({
      direction: 'outbound',
      from_number: 'sut-caller',
      to_number: '5551000',
      trunk_id: TRUNK_EXAMPLE.id,
    });
  });
});

describe('CallCoordinator — recording (feature 24)', () => {
  it('starts and stops a bridge recording, exposing the file once it starts', async () => {
    const directory = makeDirectory({
      recordAll: vi.fn().mockResolvedValue(true),
    });
    const coord = coordinator(ops, directory);

    await coord.onStasisStart(softphoneCaller);
    // Not recording yet: the callee has not answered, so no file is exposed.
    expect(events[0]?.call.recording).toBeNull();
    expect(ops.startBridgeRecording).not.toHaveBeenCalled();

    await coord.onStasisStart(calleeEntered);
    expect(ops.startBridgeRecording).toHaveBeenCalledWith('bridge-1', 'call-1');
    expect(events.at(-1)?.call.recording).toBe('call-1.wav');

    await coord.onHangup('caller-1', 'normal');
    expect(ops.stopRecording).toHaveBeenCalledWith('call-1');
    expect(events.at(-1)?.call.recording).toBe('call-1.wav');
  });

  it('does not start or stop a recording for a call that ends before answer', async () => {
    const directory = makeDirectory({
      recordAll: vi.fn().mockResolvedValue(true),
    });
    const coord = coordinator(ops, directory);
    await coord.onStasisStart(softphoneCaller);
    await coord.onHangup('caller-1', 'normal');
    expect(ops.startBridgeRecording).not.toHaveBeenCalled();
    expect(ops.stopRecording).not.toHaveBeenCalled();
    expect(events.at(-1)?.call.recording).toBeNull();
  });

  it('logs but does not throw when stopping the recording fails', async () => {
    const failing = makeOps({
      stopRecording: vi.fn().mockRejectedValue(new Error('boom')),
    });
    const directory = makeDirectory({
      recordAll: vi.fn().mockResolvedValue(true),
    });
    const coord = coordinator(failing, directory);
    await coord.onStasisStart(softphoneCaller);
    await coord.onStasisStart(calleeEntered);
    await coord.onHangup('caller-1', 'normal');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('stop recording'),
    );
  });
});

describe('CallCoordinator — defensive paths', () => {
  it('hangs up a caller with no dialed target', async () => {
    const coord = coordinator();
    await coord.onStasisStart({
      type: 'StasisStart',
      args: [],
      channel: { id: 'caller-1' },
    });
    expect(ops.hangup).toHaveBeenCalledWith('caller-1');
    expect(ops.createBridge).not.toHaveBeenCalled();
  });

  it('hangs up a caller with an empty dialed target', async () => {
    const coord = coordinator();
    await coord.onStasisStart({
      type: 'StasisStart',
      args: [],
      channel: { id: 'caller-1', dialplan: { exten: '' } },
    });
    expect(ops.hangup).toHaveBeenCalledWith('caller-1');
  });

  it('hangs up a callee leg with an unknown bridge', async () => {
    const coord = coordinator();
    await coord.onStasisStart({
      type: 'StasisStart',
      args: ['dialed', 'ghost-bridge'],
      channel: { id: 'callee-1' },
    });
    expect(ops.hangup).toHaveBeenCalledWith('callee-1');
  });

  it('hangs up a callee leg with a missing bridge id', async () => {
    const coord = coordinator();
    await coord.onStasisStart({
      type: 'StasisStart',
      args: ['dialed'],
      channel: { id: 'callee-1' },
    });
    expect(ops.hangup).toHaveBeenCalledWith('callee-1');
  });

  it('ends the call when the callee hangs up first', async () => {
    const coord = coordinator();
    await coord.onStasisStart(softphoneCaller);
    await coord.onStasisStart(calleeEntered);
    await coord.onHangup('callee-1', 'busy');
    expect(ops.hangup).toHaveBeenCalledWith('caller-1');
  });

  it('skips the other leg when the callee never entered Stasis', async () => {
    const failing = makeOps({
      originate: vi.fn().mockRejectedValue(new Error('no route')),
    });
    const coord = coordinator(failing);
    await expect(coord.onStasisStart(softphoneCaller)).rejects.toThrow();
    await coord.onHangup('caller-1', 'normal');
    expect(failing.destroyBridge).toHaveBeenCalledWith('bridge-1');
    expect(failing.hangup).not.toHaveBeenCalled();
  });

  it('ignores a hangup for an unknown channel', async () => {
    const coord = coordinator();
    await coord.onHangup('nobody', 'normal');
    expect(ops.destroyBridge).not.toHaveBeenCalled();
  });

  it('logs when tearing down a bridge fails', async () => {
    const failing = makeOps({
      destroyBridge: vi.fn().mockRejectedValue(new Error('boom')),
    });
    const coord = coordinator(failing);
    await coord.onStasisStart(softphoneCaller);
    await coord.onHangup('caller-1', 'normal');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('destroy bridge'),
    );
  });
});

describe('CallCoordinator — handlers()', () => {
  it('ignores malformed events for every handled type', () => {
    const handlers = coordinator().handlers();
    handlers.StasisStart?.({});
    handlers.StasisEnd?.({});
    handlers.ChannelHangupRequest?.({});
    expect(logger.warn).toHaveBeenCalledTimes(3);
  });

  it('dispatches a valid StasisEnd through to a bridge teardown', async () => {
    const coord = coordinator();
    const handlers = coord.handlers();
    await coord.onStasisStart(softphoneCaller);
    handlers.StasisEnd?.({ type: 'StasisEnd', channel: { id: 'caller-1' } });
    await flush();
    expect(ops.destroyBridge).toHaveBeenCalledWith('bridge-1');
  });

  it.each([
    [17, 'busy'],
    [18, 'timeout'],
    [19, 'timeout'],
    [21, 'declined'],
    [99, 'normal'],
    [undefined, 'normal'],
  ])('maps hangup cause %s to %s', async (cause, expected) => {
    const coord = coordinator();
    const handlers = coord.handlers();
    await coord.onStasisStart(softphoneCaller);
    handlers.ChannelHangupRequest?.({
      type: 'ChannelHangupRequest',
      channel: { id: 'caller-1' },
      ...(cause === undefined ? {} : { cause }),
    });
    await flush();
    expect(events.at(-1)?.call.hangup_cause).toBe(expected);
  });

  it('logs when call handling throws', async () => {
    const failing = makeOps({
      answer: vi.fn().mockRejectedValue(new Error('no answer')),
    });
    const handlers = coordinator(failing).handlers();
    handlers.StasisStart?.(softphoneCaller);
    await flush();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('call handling failed'),
    );
  });
});
