// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { useState, type ReactNode } from 'react';
import type {
  AuthMode,
  DtmfMode,
  MediaEncryption,
  Transport,
  TrunkCreate,
  TrunkDirection,
} from '@switchboard/shared';
import { Button } from '@/components/ui/button';
import { DirectionHint } from '@/components/ui/direction-hint';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  CODEC_ORDER,
  formToTrunkInput,
  toggleCodec,
  validateTrunkForm,
  type TrunkFormValues,
} from './form-model';

// The advanced carrier-style trunk form, grouped into collapsible sections so
// the common case stays short (Identity and Server open, the rest collapsed).
// Validation comes straight from the shared Zod schema: errors appear per field
// on blur and again on submit, and a valid form yields the wire body.

const DIRECTIONS: readonly TrunkDirection[] = ['inbound', 'outbound', 'both'];
const AUTH_MODES: readonly AuthMode[] = ['none', 'digest', 'ip', 'register'];
const TRANSPORTS: readonly Transport[] = ['udp', 'tcp', 'tls', 'auto'];
const DTMF_MODES: readonly DtmfMode[] = ['rfc2833', 'info', 'inband'];
const ENCRYPTIONS: readonly MediaEncryption[] = ['none', 'srtp'];

function Section({
  title,
  open,
  children,
}: {
  title: string;
  open?: boolean;
  children: ReactNode;
}): ReactNode {
  return (
    <details
      open={open ?? false}
      className="rounded-md border border-neutral-200 dark:border-neutral-800"
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        {title}
      </summary>
      <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>
    </details>
  );
}

export interface TrunkFormProps {
  initialValues: TrunkFormValues;
  onSubmit: (input: TrunkCreate) => void;
  submitLabel: string;
  submitting: boolean;
  submitError?: string | undefined;
  onCancel: () => void;
}

export function TrunkForm({
  initialValues,
  onSubmit,
  submitLabel,
  submitting,
  submitError,
  onCancel,
}: TrunkFormProps): ReactNode {
  const [values, setValues] = useState<TrunkFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setField<K extends keyof TrunkFormValues>(
    key: K,
    value: TrunkFormValues[K],
  ): void {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const { [key]: _cleared, ...rest } = current;
      return rest;
    });
  }

  function revalidate(): void {
    setErrors(validateTrunkForm(values));
  }

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    const found = validateTrunkForm(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onSubmit(formToTrunkInput(values));
  }

  const text = (
    id: keyof TrunkFormValues,
    label: string,
    value: string,
    extra?: { type?: string; hint?: ReactNode },
  ): ReactNode => (
    <Field id={id} label={label} error={errors[id]} hint={extra?.hint}>
      <Input
        id={id}
        type={extra?.type ?? 'text'}
        value={value}
        onChange={(event) => {
          setField(id, event.target.value as TrunkFormValues[typeof id]);
        }}
        onBlur={revalidate}
      />
    </Field>
  );

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <Section title="Identity" open>
        {text('name', 'Name', values.name)}
        <Field
          id="direction"
          label="Direction"
          hint={<DirectionHint direction={values.direction} />}
        >
          <Select
            id="direction"
            value={values.direction}
            onChange={(event) => {
              setField('direction', event.target.value as TrunkDirection);
            }}
            onBlur={revalidate}
          >
            {DIRECTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={values.enabled}
            onCheckedChange={(checked) => {
              setField('enabled', checked);
            }}
            aria-label="Enabled"
          />
          Enabled
        </label>
      </Section>

      <Section title="Server & transport" open>
        {text('target_host', 'Host or IP address', values.target_host)}
        {text('target_port', 'Port', values.target_port, { type: 'number' })}
        <Field id="transport" label="Transport">
          <Select
            id="transport"
            value={values.transport}
            onChange={(event) => {
              setField('transport', event.target.value as Transport);
            }}
          >
            {TRANSPORTS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        {text('outbound_proxy', 'Outbound proxy', values.outbound_proxy)}
      </Section>

      <Section title="Authentication">
        <Field id="auth_mode" label="Auth mode">
          <Select
            id="auth_mode"
            value={values.auth_mode}
            onChange={(event) => {
              setField('auth_mode', event.target.value as AuthMode);
            }}
            onBlur={revalidate}
          >
            {AUTH_MODES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        {text('username', 'Username', values.username)}
        {text('password', 'Password', values.password, { type: 'password' })}
        {text('auth_username', 'Auth username', values.auth_username)}
        {text('realm', 'Realm', values.realm)}
        {text('allowed_ips', 'Allowed IP addresses', values.allowed_ips, {
          hint: (
            <span className="text-xs text-neutral-400">comma-separated</span>
          ),
        })}
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={values.register}
            onCheckedChange={(checked) => {
              setField('register', checked);
            }}
            aria-label="Register"
          />
          Register to a remote server
        </label>
        {text('registrar', 'Registrar', values.registrar)}
        {text(
          'register_expiry',
          'Registration expiry',
          values.register_expiry,
          {
            type: 'number',
          },
        )}
      </Section>

      <Section title="Number handling">
        {text('tech_prefix', 'Technical prefix', values.tech_prefix)}
        {text('caller_id_name', 'Caller ID name', values.caller_id_name)}
        {text('caller_id_number', 'Caller ID number', values.caller_id_number)}
      </Section>

      <Section title="Media & codecs">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Codecs</legend>
          {CODEC_ORDER.map((codec) => (
            <label key={codec} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.codecs.includes(codec)}
                onChange={() => {
                  setField('codecs', toggleCodec(values.codecs, codec));
                }}
              />
              {codec}
            </label>
          ))}
        </fieldset>
        <Field id="dtmf_mode" label="DTMF mode">
          <Select
            id="dtmf_mode"
            value={values.dtmf_mode}
            onChange={(event) => {
              setField('dtmf_mode', event.target.value as DtmfMode);
            }}
          >
            {DTMF_MODES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="media_encryption" label="Media encryption">
          <Select
            id="media_encryption"
            value={values.media_encryption}
            onChange={(event) => {
              setField(
                'media_encryption',
                event.target.value as MediaEncryption,
              );
            }}
          >
            {ENCRYPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Limits">
        {text('max_cps', 'Maximum calls per second', values.max_cps, {
          type: 'number',
        })}
        {text('max_channels', 'Maximum concurrent calls', values.max_channels, {
          type: 'number',
        })}
      </Section>

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
