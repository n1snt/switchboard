// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import {
  CodecSchema,
  E164Schema,
  ErrorSchema,
  HealthSchema,
} from './common';
import { NUMBER_EXAMPLE, NumberCreateSchema, NumberSchema } from './number';
import { ROUTE_EXAMPLE, RouteCreateSchema, RouteSchema } from './route';
import { CALL_EXAMPLE, CallListQuerySchema, CallSchema } from './call';
import {
  FAULT_PROFILE_EXAMPLE,
  FaultProfileCreateSchema,
  FaultProfileSchema,
} from './fault-profile';
import { SETTINGS_EXAMPLE, SettingsSchema, SettingsUpdateSchema } from './settings';

describe('common primitives', () => {
  it('validates E.164 numbers', () => {
    expect(E164Schema.safeParse('+14155550123').success).toBe(true);
    expect(E164Schema.safeParse('4155550123').success).toBe(false);
    expect(E164Schema.safeParse('+0155').success).toBe(false);
  });

  it('accepts a codec name and rejects an unknown one', () => {
    expect(CodecSchema.parse('ulaw')).toBe('ulaw');
    expect(CodecSchema.safeParse('mp3').success).toBe(false);
  });

  it('accepts the error envelope shape', () => {
    expect(
      ErrorSchema.parse({ error: { code: 'not_found', message: 'nope' } }),
    ).toEqual({ error: { code: 'not_found', message: 'nope' } });
  });

  it('accepts a health payload', () => {
    expect(
      HealthSchema.parse({ status: 'ok', engine: 'connected', version: '0.0.0' }).engine,
    ).toBe('connected');
  });
});

describe('numbers', () => {
  it('parses the example and a create body', () => {
    expect(NumberSchema.parse(NUMBER_EXAMPLE)).toEqual(NUMBER_EXAMPLE);
    expect(
      NumberCreateSchema.parse({ e164: '+14155550123', trunk_id: 'trunk_1' }).trunk_id,
    ).toBe('trunk_1');
  });

  it('rejects a non-E.164 number', () => {
    expect(NumberCreateSchema.safeParse({ e164: 'nope', trunk_id: 't' }).success).toBe(false);
  });
});

describe('routes', () => {
  it('defaults priority to 100', () => {
    expect(
      RouteCreateSchema.parse({ direction: 'outbound', match: '*', destination: 'softphone' })
        .priority,
    ).toBe(100);
  });

  it('parses the example and rejects an unknown direction', () => {
    expect(RouteSchema.parse(ROUTE_EXAMPLE)).toEqual(ROUTE_EXAMPLE);
    expect(RouteSchema.safeParse({ ...ROUTE_EXAMPLE, direction: 'nowhere' }).success).toBe(
      false,
    );
  });
});

describe('calls', () => {
  it('parses a full call row', () => {
    expect(CallSchema.parse(CALL_EXAMPLE)).toEqual(CALL_EXAMPLE);
  });

  it('coerces query numbers and applies pagination defaults', () => {
    const parsed = CallListQuerySchema.parse({ limit: '10', direction: 'received' });
    expect(parsed.limit).toBe(10);
    expect(parsed.offset).toBe(0);
    expect(parsed.direction).toBe('received');
  });

  it('rejects an out-of-range limit', () => {
    expect(CallListQuerySchema.safeParse({ limit: 9999 }).success).toBe(false);
  });
});

describe('fault profiles', () => {
  it('parses the example and defaults audio_mode', () => {
    expect(FaultProfileSchema.parse(FAULT_PROFILE_EXAMPLE)).toEqual(FAULT_PROFILE_EXAMPLE);
    expect(FaultProfileCreateSchema.parse({ name: 'x' }).audio_mode).toBe('normal');
  });

  it('rejects a rejection code outside SIP range', () => {
    expect(FaultProfileCreateSchema.safeParse({ name: 'x', reject_code: 200 }).success).toBe(
      false,
    );
  });
});

describe('settings', () => {
  it('defaults record_all_calls to false', () => {
    expect(SettingsSchema.parse({}).record_all_calls).toBe(false);
    expect(SETTINGS_EXAMPLE.record_all_calls).toBe(false);
  });

  it('accepts a partial update', () => {
    expect(SettingsUpdateSchema.parse({ record_all_calls: true })).toEqual({
      record_all_calls: true,
    });
  });
});
