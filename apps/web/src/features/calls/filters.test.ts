// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import {
  CallSearchSchema,
  searchToQuery,
  updateSearch,
  type CallSearch,
} from './filters';

describe('CallSearchSchema', () => {
  it('parses valid filters', () => {
    expect(
      CallSearchSchema.parse({ direction: 'placed', state: 'ended' }),
    ).toEqual({ direction: 'placed', state: 'ended' });
  });

  it('drops an invalid value rather than throwing', () => {
    expect(CallSearchSchema.parse({ direction: 'sideways' })).toEqual({
      direction: undefined,
    });
  });
});

describe('searchToQuery', () => {
  it('is empty for no filters', () => {
    expect(searchToQuery({})).toEqual({});
  });

  it('maps filters and widens dates to a full-day range', () => {
    const search: CallSearch = {
      direction: 'received',
      trunk_id: 't1',
      state: 'answered',
      from: '2026-07-01',
      to: '2026-07-13',
    };
    expect(searchToQuery(search)).toEqual({
      direction: 'received',
      trunk_id: 't1',
      state: 'answered',
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-13T23:59:59.999Z',
    });
  });

  it('omits blank trunk and dates', () => {
    expect(searchToQuery({ trunk_id: '', from: '', to: '' })).toEqual({});
  });
});

describe('updateSearch', () => {
  it('sets a value', () => {
    expect(updateSearch({}, 'direction', 'placed')).toEqual({
      direction: 'placed',
    });
  });

  it('clears a value when blank', () => {
    expect(updateSearch({ direction: 'placed' }, 'direction', '')).toEqual({});
  });
});
