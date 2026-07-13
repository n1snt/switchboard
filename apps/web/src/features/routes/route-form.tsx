// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { useState, type ReactNode } from 'react';
import type { RouteCreate, RouteDirection } from '@switchboard/shared';
import { Button } from '@/components/ui/button';
import { DirectionHint } from '@/components/ui/direction-hint';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  formToRouteInput,
  validateRouteForm,
  type RouteFormValues,
} from './form-model';

// The routing-rule editor. Direction carries the inbound/outbound tooltip (this
// is one of the two config screens where that vocabulary is allowed).
// Destination is a free field: `softphone` for outbound, a trunk id for inbound.

const DIRECTIONS: readonly RouteDirection[] = ['inbound', 'outbound'];

export interface RouteFormProps {
  initialValues: RouteFormValues;
  onSubmit: (input: RouteCreate) => void;
  submitLabel: string;
  submitting: boolean;
  submitError?: string | undefined;
  onCancel: () => void;
}

export function RouteForm({
  initialValues,
  onSubmit,
  submitLabel,
  submitting,
  submitError,
  onCancel,
}: RouteFormProps): ReactNode {
  const [values, setValues] = useState<RouteFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    const found = validateRouteForm(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onSubmit(formToRouteInput(values));
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-800"
      onSubmit={handleSubmit}
      noValidate
    >
      <Field
        id="route-direction"
        label="Direction"
        hint={<DirectionHint direction={values.direction} />}
      >
        <Select
          id="route-direction"
          value={values.direction}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              direction: event.target.value as RouteDirection,
            }));
          }}
        >
          {DIRECTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="route-match" label="Match pattern" error={errors.match}>
        <Input
          id="route-match"
          placeholder="+1415*"
          value={values.match}
          onChange={(event) => {
            setValues((current) => ({ ...current, match: event.target.value }));
          }}
        />
      </Field>
      <Field
        id="route-destination"
        label="Destination"
        error={errors.destination}
      >
        <Input
          id="route-destination"
          placeholder="softphone or a trunk id"
          value={values.destination}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              destination: event.target.value,
            }));
          }}
        />
      </Field>
      <Field id="route-priority" label="Priority" error={errors.priority}>
        <Input
          id="route-priority"
          type="number"
          value={values.priority}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              priority: event.target.value,
            }));
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
