// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import {
  TrunkCreateSchema,
  type Codec,
  type Trunk,
  type TrunkCreate,
} from '@switchboard/shared';

// The trunk form's internal shape and its conversions to and from the shared
// wire type. Kept pure and separate from the component so the string/array/
// number coercions and the schema validation are unit-tested directly, which is
// where the correctness (and the coverage) lives.

/** Codecs in canonical preference order, for the media checkboxes. */
export const CODEC_ORDER: readonly Codec[] = [
  'ulaw',
  'alaw',
  'g722',
  'opus',
  'g729',
];

/** The form's field values. Text inputs are strings; lists are UI-friendly. */
export interface TrunkFormValues {
  name: string;
  direction: Trunk['direction'];
  enabled: boolean;
  auth_mode: Trunk['auth_mode'];
  username: string;
  password: string;
  auth_username: string;
  realm: string;
  allowed_ips: string;
  register: boolean;
  registrar: string;
  register_expiry: string;
  transport: Trunk['transport'];
  target_host: string;
  target_port: string;
  outbound_proxy: string;
  tech_prefix: string;
  caller_id_name: string;
  caller_id_number: string;
  codecs: Codec[];
  dtmf_mode: Trunk['dtmf_mode'];
  media_encryption: Trunk['media_encryption'];
  max_cps: string;
  max_channels: string;
}

/** Split a Quick-add address ("host:port" or a bare host) into host and port. */
export function parseAddress(address: string): { host: string; port: string } {
  const trimmed = address.trim();
  const colon = trimmed.lastIndexOf(':');
  if (colon > 0) {
    const port = trimmed.slice(colon + 1);
    if (/^\d+$/.test(port)) {
      return { host: trimmed.slice(0, colon), port };
    }
  }
  return { host: trimmed, port: '5060' };
}

/** Toggle a codec in the selection, keeping the result in canonical order. */
export function toggleCodec(current: readonly Codec[], codec: Codec): Codec[] {
  const next = new Set(current);
  if (next.has(codec)) {
    next.delete(codec);
  } else {
    next.add(codec);
  }
  return CODEC_ORDER.filter((entry) => next.has(entry));
}

/** A blank form, matching the schema defaults for the common Quick-add path. */
export function defaultTrunkForm(): TrunkFormValues {
  return {
    name: '',
    direction: 'both',
    enabled: true,
    auth_mode: 'none',
    username: '',
    password: '',
    auth_username: '',
    realm: '',
    allowed_ips: '',
    register: false,
    registrar: '',
    register_expiry: '',
    transport: 'udp',
    target_host: '',
    target_port: '5060',
    outbound_proxy: '',
    tech_prefix: '',
    caller_id_name: '',
    caller_id_number: '',
    codecs: ['ulaw', 'alaw'],
    dtmf_mode: 'rfc2833',
    media_encryption: 'none',
    max_cps: '',
    max_channels: '',
  };
}

/** Fill the form from an existing trunk for the edit screen. */
export function trunkToForm(trunk: Trunk): TrunkFormValues {
  return {
    name: trunk.name,
    direction: trunk.direction,
    enabled: trunk.enabled,
    auth_mode: trunk.auth_mode,
    username: trunk.username ?? '',
    password: trunk.password ?? '',
    auth_username: trunk.auth_username ?? '',
    realm: trunk.realm ?? '',
    allowed_ips: trunk.allowed_ips.join(', '),
    register: trunk.register,
    registrar: trunk.registrar ?? '',
    register_expiry:
      trunk.register_expiry === undefined ? '' : String(trunk.register_expiry),
    transport: trunk.transport,
    target_host: trunk.target_host ?? '',
    target_port: String(trunk.target_port),
    outbound_proxy: trunk.outbound_proxy ?? '',
    tech_prefix: trunk.dial_rewrite.tech_prefix ?? '',
    caller_id_name: trunk.caller_id_name ?? '',
    caller_id_number: trunk.caller_id_number ?? '',
    codecs: [...trunk.codecs],
    dtmf_mode: trunk.dtmf_mode,
    media_encryption: trunk.media_encryption,
    max_cps: trunk.max_cps === null ? '' : String(trunk.max_cps),
    max_channels: trunk.max_channels === null ? '' : String(trunk.max_channels),
  };
}

/** Parse a comma/space separated address list into trimmed, non-empty entries. */
function parseList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** Parse an integer field; empty or non-numeric becomes undefined. */
function parseIntOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** Build the create/update wire body from the form, omitting blank optionals. */
export function formToTrunkInput(values: TrunkFormValues): TrunkCreate {
  const port = parseIntOrUndefined(values.target_port);
  const expiry = parseIntOrUndefined(values.register_expiry);
  const cps = parseIntOrUndefined(values.max_cps);
  const channels = parseIntOrUndefined(values.max_channels);

  return {
    name: values.name.trim(),
    direction: values.direction,
    enabled: values.enabled,
    auth_mode: values.auth_mode,
    register: values.register,
    transport: values.transport,
    allowed_ips: parseList(values.allowed_ips),
    codecs: values.codecs,
    dtmf_mode: values.dtmf_mode,
    media_encryption: values.media_encryption,
    target_port: port ?? 5060,
    dial_rewrite: {
      rules: [],
      ...(values.tech_prefix.trim() !== ''
        ? { tech_prefix: values.tech_prefix.trim() }
        : {}),
    },
    max_cps: cps ?? null,
    max_channels: channels ?? null,
    ...(values.username !== '' ? { username: values.username } : {}),
    ...(values.password !== '' ? { password: values.password } : {}),
    ...(values.auth_username !== ''
      ? { auth_username: values.auth_username }
      : {}),
    ...(values.realm !== '' ? { realm: values.realm } : {}),
    ...(expiry !== undefined ? { register_expiry: expiry } : {}),
    ...(values.registrar !== '' ? { registrar: values.registrar } : {}),
    ...(values.target_host.trim() !== ''
      ? { target_host: values.target_host.trim() }
      : {}),
    ...(values.outbound_proxy !== ''
      ? { outbound_proxy: values.outbound_proxy }
      : {}),
    ...(values.caller_id_name !== ''
      ? { caller_id_name: values.caller_id_name }
      : {}),
    ...(values.caller_id_number !== ''
      ? { caller_id_number: values.caller_id_number }
      : {}),
  };
}

/**
 * Validate the form against the shared schema and return one message per field,
 * keyed by the top-level field name so the component can show it inline.
 */
export function validateTrunkForm(
  values: TrunkFormValues,
): Record<string, string> {
  const result = TrunkCreateSchema.safeParse(formToTrunkInput(values));
  if (result.success) {
    return {};
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    // Every issue our schema raises carries a top-level field name; key by it so
    // the component shows one message per field. First issue per field wins.
    const key = String(issue.path[0]);
    errors[key] ??= issue.message;
  }
  return errors;
}
