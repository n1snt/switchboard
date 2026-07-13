// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import type { PhoneNumber, Route, Trunk } from '@switchboard/shared';
import {
  NUMBER_EXAMPLE,
  ROUTE_EXAMPLE,
  TRUNK_EXAMPLE,
} from '@switchboard/shared';
import {
  SOFTPHONE_ENDPOINT,
  endpointFromChannelName,
  planCall,
  type CallPlanInput,
} from './call-plan';

const trunk: Trunk = { ...TRUNK_EXAMPLE };
const number: PhoneNumber = { ...NUMBER_EXAMPLE };

function input(overrides: Partial<CallPlanInput> = {}): CallPlanInput {
  return {
    callId: 'call-1',
    dialed: '1002',
    from: '1001',
    callerTrunk: undefined,
    numbers: [],
    trunks: [],
    routes: [],
    recordAll: false,
    ...overrides,
  };
}

describe('endpointFromChannelName', () => {
  it('extracts the endpoint from a PJSIP channel name', () => {
    expect(endpointFromChannelName('PJSIP/1001-00000abc')).toBe('1001');
  });

  it('keeps hyphens in the endpoint, stripping only the unique-id suffix', () => {
    expect(endpointFromChannelName('PJSIP/trunk-ab-cd-0000ffff')).toBe(
      'trunk-ab-cd',
    );
  });

  it('returns undefined for an absent or unparseable name', () => {
    expect(endpointFromChannelName(undefined)).toBeUndefined();
    expect(endpointFromChannelName('PJSIP1001')).toBeUndefined();
    expect(endpointFromChannelName('PJSIP/1001')).toBeUndefined();
  });
});

describe('planCall — softphone caller (inbound, feature 17)', () => {
  it('routes a saved number through its trunk', () => {
    const plan = planCall(
      input({ dialed: number.e164, numbers: [number], trunks: [trunk] }),
    );
    expect(plan).toMatchObject({
      direction: 'inbound',
      from: '1001',
      to: number.e164,
      trunkId: trunk.id,
      calleeEndpoint: `PJSIP/${number.e164}@${trunk.id}`,
      recording: null,
    });
  });

  it('dials a bare extension straight through (walking skeleton)', () => {
    const plan = planCall(input({ dialed: '1002' }));
    expect(plan.direction).toBe('inbound');
    expect(plan.calleeEndpoint).toBe('PJSIP/1002');
    expect(plan.trunkId).toBeNull();
  });
});

describe('planCall — trunk caller (outbound, feature 16)', () => {
  it('rings the softphone by default when no route matches', () => {
    const plan = planCall(
      input({ callerTrunk: trunk, dialed: '+14155550123', from: 'sut' }),
    );
    expect(plan).toMatchObject({
      direction: 'outbound',
      from: 'sut',
      to: '+14155550123',
      trunkId: trunk.id,
      calleeEndpoint: `PJSIP/${SOFTPHONE_ENDPOINT}`,
    });
  });

  it('honors an explicit outbound route destination', () => {
    const route: Route = { ...ROUTE_EXAMPLE, match: '*', destination: '1002' };
    const plan = planCall(
      input({ callerTrunk: trunk, dialed: '5551234', routes: [route] }),
    );
    expect(plan.calleeEndpoint).toBe('PJSIP/1002');
  });

  it('sends a matched softphone route to the softphone endpoint', () => {
    const route: Route = {
      ...ROUTE_EXAMPLE,
      match: '*',
      destination: 'softphone',
    };
    const plan = planCall(
      input({ callerTrunk: trunk, dialed: '5551234', routes: [route] }),
    );
    expect(plan.calleeEndpoint).toBe(`PJSIP/${SOFTPHONE_ENDPOINT}`);
  });
});

describe('planCall — recording decision', () => {
  it('names a recording file when record-all is on', () => {
    expect(planCall(input({ recordAll: true })).recording).toBe('call-1.wav');
  });

  it('records nothing when record-all is off', () => {
    expect(planCall(input({ recordAll: false })).recording).toBeNull();
  });
});
