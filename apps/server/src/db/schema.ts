// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

// The Kysely database interface: one table interface per table, aligned with the
// shared Zod schemas but expressed as SQLite column types. Booleans are integers
// (0/1) and JSON columns are text; repositories map these at the edge (mappers.ts)
// so everything past the repository boundary is fully typed.

/** Applied-migration bookkeeping (see migrate.ts). */
export interface MigrationsTable {
  name: string;
  applied_at: string;
}

export interface TrunksTable {
  id: string;
  name: string;
  direction: string;
  enabled: number;
  auth_mode: string;
  username: string | null;
  password: string | null;
  auth_username: string | null;
  realm: string | null;
  allowed_ips: string;
  register: number;
  registrar: string | null;
  register_expiry: number | null;
  transport: string;
  target_host: string | null;
  target_port: number;
  outbound_proxy: string | null;
  dial_rewrite: string;
  caller_id_name: string | null;
  caller_id_number: string | null;
  codecs: string;
  dtmf_mode: string;
  media_encryption: string;
  record: number;
  max_cps: number | null;
  max_channels: number | null;
  source: string;
  created_at: string;
}

export interface NumbersTable {
  id: string;
  e164: string;
  trunk_id: string;
  label: string | null;
}

export interface RoutesTable {
  id: string;
  direction: string;
  match: string;
  destination: string;
  priority: number;
}

export interface CallsTable {
  id: string;
  direction: string;
  from_number: string;
  to_number: string;
  trunk_id: string | null;
  state: string;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  hangup_cause: string | null;
  codec: string | null;
  recording: string | null;
}

export interface SettingsTable {
  key: string;
  value: string;
  updated_at: string;
}

// PJSIP realtime tables (Decision D1). Asterisk reads these directly; the trunk
// provisioner (feature 11) is the only code that writes them.
export interface PsAorsTable {
  id: string;
  contact: string | null;
  max_contacts: number | null;
  qualify_frequency: number | null;
}

export interface PsAuthsTable {
  id: string;
  auth_type: string | null;
  username: string | null;
  password: string | null;
  realm: string | null;
}

export interface PsEndpointsTable {
  id: string;
  transport: string | null;
  aors: string | null;
  auth: string | null;
  outbound_auth: string | null;
  context: string | null;
  disallow: string | null;
  allow: string | null;
  direct_media: string | null;
  dtmf_mode: string | null;
}

// Source-IP identification for an `ip`-auth trunk (feature 16): matches an
// inbound INVITE to its endpoint by sender address (res_pjsip_endpoint_identifier_ip).
export interface PsEndpointIdIpsTable {
  id: string;
  endpoint: string | null;
  match: string | null;
}

/**
 * The full database shape. `fault_profiles` is added by feature 26; it is absent
 * here so the interface only ever describes tables that a migration has created.
 */
export interface Database {
  migrations: MigrationsTable;
  trunks: TrunksTable;
  numbers: NumbersTable;
  routes: RoutesTable;
  calls: CallsTable;
  settings: SettingsTable;
  ps_aors: PsAorsTable;
  ps_auths: PsAuthsTable;
  ps_endpoints: PsEndpointsTable;
  ps_endpoint_id_ips: PsEndpointIdIpsTable;
}
