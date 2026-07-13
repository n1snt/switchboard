// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { NUMBER_EXAMPLE } from '@switchboard/shared';
import { describe, expect, it } from 'vitest';
import {
  defaultNumberForm,
  formToNumberInput,
  numberToForm,
  validateNumberForm,
} from './form-model';

describe('defaultNumberForm', () => {
  it('is blank', () => {
    expect(defaultNumberForm()).toEqual({ e164: '', trunk_id: '', label: '' });
  });
});

describe('numberToForm', () => {
  it('fills from an example with a label', () => {
    expect(numberToForm(NUMBER_EXAMPLE)).toEqual({
      e164: '+14155550123',
      trunk_id: 'trunk_Zm9vYmFy',
      label: 'Main line',
    });
  });

  it('defaults a missing label to empty', () => {
    const { label: _drop, ...rest } = NUMBER_EXAMPLE;
    expect(numberToForm(rest).label).toBe('');
  });
});

describe('formToNumberInput', () => {
  it('omits a blank label', () => {
    const input = formToNumberInput({
      e164: ' +14155550123 ',
      trunk_id: 't1',
      label: '  ',
    });
    expect(input).toEqual({ e164: '+14155550123', trunk_id: 't1' });
  });

  it('includes a trimmed label', () => {
    const input = formToNumberInput({
      e164: '+14155550123',
      trunk_id: 't1',
      label: ' Main ',
    });
    expect(input.label).toBe('Main');
  });
});

describe('validateNumberForm', () => {
  it('passes a valid number', () => {
    expect(
      validateNumberForm({ e164: '+14155550123', trunk_id: 't1', label: '' }),
    ).toEqual({});
  });

  it('flags a bad E.164 value', () => {
    expect(
      validateNumberForm({ e164: '1234', trunk_id: 't1', label: '' }),
    ).toHaveProperty('e164');
  });

  it('requires a trunk', () => {
    expect(
      validateNumberForm({ e164: '+14155550123', trunk_id: '', label: '' }),
    ).toHaveProperty('trunk_id');
  });
});
