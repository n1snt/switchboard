// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import {
  NumberCreateSchema,
  type PhoneNumber,
  type PhoneNumberCreate,
} from '@switchboard/shared';

// The number form's shape and its conversion to and from the wire type. Pure,
// so the E.164 and trunk-reference validation is unit-tested directly.

export interface NumberFormValues {
  e164: string;
  trunk_id: string;
  label: string;
}

export function defaultNumberForm(): NumberFormValues {
  return { e164: '', trunk_id: '', label: '' };
}

export function numberToForm(number: PhoneNumber): NumberFormValues {
  return {
    e164: number.e164,
    trunk_id: number.trunk_id,
    label: number.label ?? '',
  };
}

export function formToNumberInput(values: NumberFormValues): PhoneNumberCreate {
  return {
    e164: values.e164.trim(),
    trunk_id: values.trunk_id,
    ...(values.label.trim() !== '' ? { label: values.label.trim() } : {}),
  };
}

export function validateNumberForm(
  values: NumberFormValues,
): Record<string, string> {
  const result = NumberCreateSchema.safeParse(formToNumberInput(values));
  if (result.success) {
    return {};
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0]);
    errors[key] ??= issue.message;
  }
  return errors;
}
