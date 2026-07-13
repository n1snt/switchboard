// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { ROUTE_EXAMPLE } from '@switchboard/shared';
import { describe, expect, it } from 'vitest';
import {
  defaultRouteForm,
  formToRouteInput,
  routeToForm,
  validateRouteForm,
} from './form-model';

describe('defaultRouteForm', () => {
  it('defaults to an outbound rule at priority 100', () => {
    expect(defaultRouteForm()).toEqual({
      direction: 'outbound',
      match: '',
      destination: '',
      priority: '100',
    });
  });
});

describe('routeToForm', () => {
  it('fills from an example', () => {
    expect(routeToForm(ROUTE_EXAMPLE)).toEqual({
      direction: 'outbound',
      match: '+1415*',
      destination: 'softphone',
      priority: '100',
    });
  });
});

describe('formToRouteInput', () => {
  it('parses a numeric priority', () => {
    const input = formToRouteInput({
      direction: 'inbound',
      match: ' +1* ',
      destination: ' t1 ',
      priority: '5',
    });
    expect(input).toEqual({
      direction: 'inbound',
      match: '+1*',
      destination: 't1',
      priority: 5,
    });
  });

  it('omits an empty or non-numeric priority', () => {
    expect(
      formToRouteInput({
        direction: 'outbound',
        match: 'x',
        destination: 'softphone',
        priority: '',
      }),
    ).not.toHaveProperty('priority');
    expect(
      formToRouteInput({
        direction: 'outbound',
        match: 'x',
        destination: 'softphone',
        priority: 'abc',
      }),
    ).not.toHaveProperty('priority');
  });
});

describe('validateRouteForm', () => {
  it('passes a valid rule', () => {
    expect(validateRouteForm(defaultRouteForm())).toHaveProperty('match');
    expect(
      validateRouteForm({
        direction: 'outbound',
        match: '+1*',
        destination: 'softphone',
        priority: '100',
      }),
    ).toEqual({});
  });

  it('requires a destination', () => {
    expect(
      validateRouteForm({
        direction: 'outbound',
        match: '+1*',
        destination: '',
        priority: '100',
      }),
    ).toHaveProperty('destination');
  });
});
