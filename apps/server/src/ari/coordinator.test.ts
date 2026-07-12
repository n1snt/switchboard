// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CallEvent } from '@switchboard/shared';
import { EventBus } from '../events/bus';
import type { Logger } from '../logger';
import { CallCoordinator } from './coordinator';
import type { AriOperations } from './operations';

function makeOps(overrides: Partial<AriOperations> = {}): AriOperations {
  return {
    answer: vi.fn().mockResolvedValue(undefined),
    hangup: vi.fn().mockResolvedValue(undefined),
    createBridge: vi.fn().mockResolvedValue('bridge-1'),
    destroyBridge: vi.fn().mockResolvedValue(undefined),
    addToBridge: vi.fn().mockResolvedValue(undefined),
    originate: vi.fn().mockResolvedValue('callee-1'),
    ...overrides,
  };
}

const logger: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const flush = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

let ops: AriOperations;
let bus: EventBus;
let events: CallEvent[];

function coordinator(customOps: AriOperations = ops): CallCoordinator {
  return new CallCoordinator({
    ops: customOps,
    bus,
    appName: 'switchboard',
    logger,
    now: () => '2026-07-13T10:00:00.000Z',
    idGen: () => 'call-1',
  });
}

const callerEvent = {
  type: 'StasisStart' as const,
  args: [] as string[],
  channel: {
    id: 'caller-1',
    dialplan: { exten: '1002' },
    caller: { number: '1001' },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  ops = makeOps();
  bus = new EventBus();
  events = [];
  bus.subscribe((event) => events.push(event));
});

describe('CallCoordinator happy path', () => {
  it('bridges caller and callee and ends the call', async () => {
    const coord = coordinator();

    await coord.onStasisStart(callerEvent);
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
    expect(events[0]?.call.to_number).toBe('1002');
    expect(events[0]?.call.from_number).toBe('1001');

    await coord.onStasisStart({
      type: 'StasisStart',
      args: ['dialed', 'bridge-1'],
      channel: { id: 'callee-1' },
    });
    expect(ops.answer).toHaveBeenCalledWith('callee-1');
    expect(ops.addToBridge).toHaveBeenCalledWith('bridge-1', 'callee-1');
    expect(events.at(-1)?.type).toBe('call.answered');
    expect(events.at(-1)?.call.answered_at).toBe('2026-07-13T10:00:00.000Z');

    await coord.onHangup('caller-1', 'normal');
    expect(ops.destroyBridge).toHaveBeenCalledWith('bridge-1');
    expect(ops.hangup).toHaveBeenCalledWith('callee-1');
    const ended = events.at(-1);
    expect(ended?.type).toBe('call.ended');
    expect(ended?.call.hangup_cause).toBe('normal');
    expect(ended?.call.state).toBe('ended');
  });

  it('uses a real clock and id generator by default', async () => {
    const coord = new CallCoordinator({
      ops,
      bus,
      appName: 'switchboard',
      logger,
    });
    await coord.onStasisStart(callerEvent);
    expect(events[0]?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(events[0]?.call.id).toMatch(/\w+/);
  });

  it('falls back to the channel id when no caller number is present', async () => {
    const coord = coordinator();
    await coord.onStasisStart({
      type: 'StasisStart',
      args: [],
      channel: { id: 'caller-9', dialplan: { exten: '1002' } },
    });
    expect(events[0]?.call.from_number).toBe('caller-9');
  });
});

describe('CallCoordinator defensive paths', () => {
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
    await coord.onStasisStart(callerEvent);
    await coord.onStasisStart({
      type: 'StasisStart',
      args: ['dialed', 'bridge-1'],
      channel: { id: 'callee-1' },
    });
    await coord.onHangup('callee-1', 'busy');
    expect(ops.hangup).toHaveBeenCalledWith('caller-1');
  });

  it('skips hanging up the other leg when the callee never entered Stasis', async () => {
    // Originate rejects, so the session is stored (bridge created, events sent)
    // but calleeChannelId is never set.
    const failing = makeOps({
      originate: vi.fn().mockRejectedValue(new Error('no route')),
    });
    const coord = coordinator(failing);
    await expect(coord.onStasisStart(callerEvent)).rejects.toThrow();
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
    await coord.onStasisStart(callerEvent);
    await coord.onHangup('caller-1', 'normal');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('destroy bridge'),
    );
  });
});

describe('CallCoordinator handlers()', () => {
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
    await coord.onStasisStart(callerEvent);
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
    await coord.onStasisStart(callerEvent);
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
    handlers.StasisStart?.(callerEvent);
    await flush();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('call handling failed'),
    );
  });
});
