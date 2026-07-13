// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { useState, type ReactNode } from 'react';
import type { PhoneNumberCreate, Trunk } from '@switchboard/shared';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  formToNumberInput,
  validateNumberForm,
  type NumberFormValues,
} from './form-model';

// The number create/edit form: an E.164 value, the inbound trunk that delivers
// it, and an optional label. The trunk picker lists only inbound-capable trunks
// (a number is delivered to your system, the data-model inbound direction).

/** Trunks that can deliver an inbound number (inbound or both). */
export function inboundTrunks(trunks: readonly Trunk[]): Trunk[] {
  return trunks.filter((trunk) => trunk.direction !== 'outbound');
}

export interface NumberFormProps {
  trunks: readonly Trunk[];
  initialValues: NumberFormValues;
  onSubmit: (input: PhoneNumberCreate) => void;
  submitLabel: string;
  submitting: boolean;
  submitError?: string | undefined;
  onCancel: () => void;
}

export function NumberForm({
  trunks,
  initialValues,
  onSubmit,
  submitLabel,
  submitting,
  submitError,
  onCancel,
}: NumberFormProps): ReactNode {
  const [values, setValues] = useState<NumberFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const options = inboundTrunks(trunks);

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    const found = validateNumberForm(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onSubmit(formToNumberInput(values));
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <Field id="e164" label="Phone number (E.164)" error={errors.e164}>
        <Input
          id="e164"
          placeholder="+14155550123"
          value={values.e164}
          onChange={(event) => {
            setValues((current) => ({ ...current, e164: event.target.value }));
          }}
        />
      </Field>
      <Field id="trunk_id" label="Inbound trunk" error={errors.trunk_id}>
        <Select
          id="trunk_id"
          value={values.trunk_id}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              trunk_id: event.target.value,
            }));
          }}
        >
          <option value="">Select a trunk…</option>
          {options.map((trunk) => (
            <option key={trunk.id} value={trunk.id}>
              {trunk.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="label" label="Label (optional)" error={errors.label}>
        <Input
          id="label"
          value={values.label}
          onChange={(event) => {
            setValues((current) => ({ ...current, label: event.target.value }));
          }}
        />
      </Field>

      {submitError === undefined ? null : (
        <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
