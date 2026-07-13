// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Call, CallEvent } from '@switchboard/shared';
import { CALL_EXAMPLE } from '@switchboard/shared';
import { createTestApp, type TestApp } from '../../testing/harness';
import { EventBus } from '../../events/bus';
import { CallRepo } from './calls.repo';
import { CallWriter } from './call-writer';

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const flush = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

function event(type: CallEvent['type'], call: Partial<Call>): CallEvent {
  const base = {
    at: '2026-07-13T10:00:00.000Z',
    call: { ...CALL_EXAMPLE, ...call },
  };
  return type === 'call.state_changed'
    ? { type, state: base.call.state, ...base }
    : { type, ...base };
}

describe('CallWriter (integration over the bus and repo)', () => {
  let harness: TestApp;
  let repo: CallRepo;
  let unsubscribe: () => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    harness = await createTestApp();
    repo = new CallRepo(harness.db);
    unsubscribe = new CallWriter(repo, logger).subscribe(harness.bus);
  });

  afterEach(async () => {
    unsubscribe();
    await harness.close();
  });

  it('persists a call and updates it as its lifecycle advances', async () => {
    harness.bus.publish(
      event('call.created', { id: 'c1', state: 'created', trunk_id: null }),
    );
    await flush();
    expect((await repo.get('c1'))?.state).toBe('created');

    harness.bus.publish(
      event('call.ended', {
        id: 'c1',
        state: 'ended',
        trunk_id: null,
        hangup_cause: 'normal',
      }),
    );
    await flush();
    const final = await repo.get('c1');
    expect(final?.state).toBe('ended');
    expect(final?.hangup_cause).toBe('normal');
  });

  it('stops persisting after unsubscribe', async () => {
    unsubscribe();
    harness.bus.publish(event('call.created', { id: 'c2', trunk_id: null }));
    await flush();
    expect(await repo.get('c2')).toBeUndefined();
  });
});

describe('CallWriter error handling', () => {
  it('logs when persistence fails', async () => {
    vi.clearAllMocks();
    const failing = {
      upsert: vi.fn().mockRejectedValue(new Error('disk full')),
    } as unknown as CallRepo;
    const bus = new EventBus();
    const off = new CallWriter(failing, logger).subscribe(bus);
    bus.publish(event('call.created', { id: 'c3', trunk_id: null }));
    await flush();
    off();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('failed to persist'),
    );
  });
});
