// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import type { Client } from 'ari-client';
import { createAriOperations } from './operations';

function fakeClient() {
  const channels = {
    answer: vi.fn().mockResolvedValue(undefined),
    hangup: vi.fn().mockResolvedValue(undefined),
    originate: vi.fn().mockResolvedValue({ id: 'callee-1' }),
    getChannelVar: vi.fn().mockResolvedValue({ value: 'ulaw' }),
  };
  const bridges = {
    create: vi.fn().mockResolvedValue({ id: 'bridge-1' }),
    destroy: vi.fn().mockResolvedValue(undefined),
    addChannel: vi.fn().mockResolvedValue(undefined),
    record: vi.fn().mockResolvedValue({ name: 'call-1' }),
  };
  const recordings = {
    stop: vi.fn().mockResolvedValue(undefined),
  };
  const client = { channels, bridges, recordings } as unknown as Client;
  return { client, channels, bridges, recordings };
}

describe('createAriOperations', () => {
  it('answers and hangs up channels', async () => {
    const { client, channels } = fakeClient();
    const ops = createAriOperations(client);
    await ops.answer('c1');
    await ops.hangup('c1');
    expect(channels.answer).toHaveBeenCalledWith({ channelId: 'c1' });
    expect(channels.hangup).toHaveBeenCalledWith({ channelId: 'c1' });
  });

  it('creates, destroys, and adds channels to a mixing bridge', async () => {
    const { client, bridges } = fakeClient();
    const ops = createAriOperations(client);
    const id = await ops.createBridge();
    expect(id).toBe('bridge-1');
    expect(bridges.create).toHaveBeenCalledWith({ type: 'mixing' });
    await ops.addToBridge('bridge-1', 'c1');
    expect(bridges.addChannel).toHaveBeenCalledWith({
      bridgeId: 'bridge-1',
      channel: 'c1',
    });
    await ops.destroyBridge('bridge-1');
    expect(bridges.destroy).toHaveBeenCalledWith({ bridgeId: 'bridge-1' });
  });

  it('originates with joined appArgs and an optional caller id', async () => {
    const { client, channels } = fakeClient();
    const ops = createAriOperations(client);

    const id = await ops.originate({
      endpoint: 'PJSIP/1002',
      app: 'switchboard',
      appArgs: ['dialed', 'bridge-1'],
      callerId: '+14155550123',
    });
    expect(id).toBe('callee-1');
    expect(channels.originate).toHaveBeenCalledWith({
      endpoint: 'PJSIP/1002',
      app: 'switchboard',
      appArgs: 'dialed,bridge-1',
      callerId: '+14155550123',
    });

    await ops.originate({
      endpoint: 'PJSIP/1002',
      app: 'switchboard',
      appArgs: [],
    });
    expect(channels.originate).toHaveBeenLastCalledWith({
      endpoint: 'PJSIP/1002',
      app: 'switchboard',
      appArgs: '',
    });
  });

  it('records a bridge to wav and stops a recording by name', async () => {
    const { client, bridges, recordings } = fakeClient();
    const ops = createAriOperations(client);

    await ops.startBridgeRecording('bridge-1', 'call-1');
    expect(bridges.record).toHaveBeenCalledWith({
      bridgeId: 'bridge-1',
      name: 'call-1',
      format: 'wav',
    });

    await ops.stopRecording('call-1');
    expect(recordings.stop).toHaveBeenCalledWith({ recordingName: 'call-1' });
  });

  it('reads a channel variable and returns undefined on failure', async () => {
    const { client, channels } = fakeClient();
    const ops = createAriOperations(client);

    expect(await ops.getChannelVar('c1', 'CHANNEL(audionativeformat)')).toBe(
      'ulaw',
    );
    expect(channels.getChannelVar).toHaveBeenCalledWith({
      channelId: 'c1',
      variable: 'CHANNEL(audionativeformat)',
    });

    channels.getChannelVar.mockRejectedValueOnce(new Error('unset'));
    expect(
      await ops.getChannelVar('c1', 'CHANNEL(pjsip,call-id)'),
    ).toBeUndefined();
  });
});
