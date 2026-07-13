// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { CodecSchema, IdSchema, TimestampSchema } from './common';

// A trunk is a connection between Switchboard and the system-under-test, with its
// own credentials and behavior. Mirrors the `trunks` table in data-model.md.
// Field names are snake_case to match the storage columns; the repository maps
// only JSON and boolean columns at the edge.

/** Direction, from the system-under-test's point of view. */
export const TrunkDirectionSchema = z
  .enum(['inbound', 'outbound', 'both'])
  .describe(
    'inbound: the softphone places a call to your system; outbound: your system places a call and the softphone rings; both.',
  );

/** Trust model the trunk enforces. */
export const AuthModeSchema = z
  .enum(['none', 'digest', 'ip', 'register'])
  .describe('none accepts anything; digest, ip allowlist, or register.');

/** Signaling transport. `auto` accepts any; the others are strict. */
export const TransportSchema = z
  .enum(['udp', 'tcp', 'tls', 'auto'])
  .describe('Signaling transport; anything but auto is strict.');

export const DtmfModeSchema = z
  .enum(['rfc2833', 'info', 'inband'])
  .describe('How keypad tones (DTMF) are carried.');

export const MediaEncryptionSchema = z
  .enum(['none', 'srtp'])
  .describe('Media (RTP) encryption.');

/** Whether a trunk was created in the dashboard or seeded from the environment. */
export const TrunkSourceSchema = z
  .enum(['ui', 'env'])
  .describe(
    'ui: created via API/dashboard; env: seeded from SWITCHBOARD_SIP_SERVERS.',
  );

/** Technical prefix plus ordered pattern rewrites applied to the dialed number. */
export const DialRewriteSchema = z
  .object({
    tech_prefix: z
      .string()
      .optional()
      .describe(
        'Prefix prepended to the dialed number, as many carriers require.',
      ),
    rules: z
      .array(
        z.object({
          match: z
            .string()
            .describe('Regular expression matched against the number.'),
          replace: z
            .string()
            .describe('Replacement applied when the pattern matches.'),
        }),
      )
      .default([])
      .describe('Ordered find/replace rules applied to the dialed number.'),
  })
  .describe('Dial-string rewriting for catching number-format bugs locally.');

/** Every user-configurable trunk field, with defaults for the Quick-add path. */
export const TrunkBaseSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe('Human-readable label; also what the dialler shows.'),
  direction: TrunkDirectionSchema.default('both'),
  enabled: z
    .boolean()
    .default(true)
    .describe('When false, the trunk rejects and is hidden from the dialler.'),
  auth_mode: AuthModeSchema.default('none'),
  username: z
    .string()
    .optional()
    .describe('Digest username, when auth_mode is digest.'),
  password: z
    .string()
    .optional()
    .describe('Digest password, when auth_mode is digest.'),
  auth_username: z
    .string()
    .optional()
    .describe('Auth username when it differs from the SIP username.'),
  realm: z.string().optional().describe('Optional digest realm.'),
  allowed_ips: z
    .array(z.string())
    .default([])
    .describe('Source IP addresses to trust, when auth_mode is ip.'),
  register: z
    .boolean()
    .default(false)
    .describe('When true, the trunk registers to a remote server.'),
  registrar: z
    .string()
    .optional()
    .describe('Registrar address, when register is true.'),
  register_expiry: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Registration interval in seconds, when registering.'),
  transport: TransportSchema.default('udp'),
  target_host: z
    .string()
    .optional()
    .describe("Host of your system's SIP endpoint, for inbound delivery."),
  target_port: z
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(5060)
    .describe(
      "Port of your system's SIP endpoint (default 5060, 5061 for TLS).",
    ),
  outbound_proxy: z
    .string()
    .optional()
    .describe('Optional proxy address to route signaling through.'),
  dial_rewrite: DialRewriteSchema.default({ rules: [] }),
  caller_id_name: z
    .string()
    .optional()
    .describe('Display name presented on outgoing calls (the From header).'),
  caller_id_number: z
    .string()
    .optional()
    .describe('Number presented on outgoing calls.'),
  codecs: z
    .array(CodecSchema)
    .default(['ulaw', 'alaw'])
    .describe('Ordered allow-list of audio codecs; order is preference.'),
  dtmf_mode: DtmfModeSchema.default('rfc2833'),
  media_encryption: MediaEncryptionSchema.default('none'),
  record: z
    .boolean()
    .default(false)
    .describe('Record calls on this trunk by default.'),
  max_cps: z
    .number()
    .int()
    .positive()
    .nullable()
    .default(null)
    .describe('Optional calls-per-second cap. Null means no limit.'),
  max_channels: z
    .number()
    .int()
    .positive()
    .nullable()
    .default(null)
    .describe('Optional concurrent-call cap. Null means no limit.'),
});

/**
 * Cross-field rules that hold for a complete trunk definition: digest needs
 * credentials, ip mode needs at least one address, registration needs a
 * registrar, and any inbound-capable trunk needs a target host to deliver to.
 */
function refineTrunk(
  value: z.infer<typeof TrunkBaseSchema>,
  ctx: z.RefinementCtx,
): void {
  if (value.auth_mode === 'digest' && (!value.username || !value.password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'digest auth requires a username and password',
      path: ['username'],
    });
  }
  if (value.auth_mode === 'ip' && value.allowed_ips.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'ip auth requires at least one allowed address',
      path: ['allowed_ips'],
    });
  }
  if (value.register && !value.registrar) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'registration requires a registrar',
      path: ['registrar'],
    });
  }
  if (value.direction !== 'outbound' && !value.target_host) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'an inbound-capable trunk requires a target host',
      path: ['target_host'],
    });
  }
}

/** POST /trunks body. */
export const TrunkCreateSchema = TrunkBaseSchema.superRefine(refineTrunk);

/** PATCH /trunks/:id body. Every field optional; cross-field rules relax. */
export const TrunkUpdateSchema = TrunkBaseSchema.partial();

/** A stored trunk as returned by the API. */
export const TrunkSchema = TrunkBaseSchema.extend({
  id: IdSchema,
  source: TrunkSourceSchema,
  created_at: TimestampSchema,
}).describe('A SIP trunk between Switchboard and your system.');

export type TrunkDirection = z.infer<typeof TrunkDirectionSchema>;
export type AuthMode = z.infer<typeof AuthModeSchema>;
export type Transport = z.infer<typeof TransportSchema>;
export type DtmfMode = z.infer<typeof DtmfModeSchema>;
export type MediaEncryption = z.infer<typeof MediaEncryptionSchema>;
export type TrunkSource = z.infer<typeof TrunkSourceSchema>;
export type DialRewrite = z.infer<typeof DialRewriteSchema>;
export type Trunk = z.infer<typeof TrunkSchema>;
export type TrunkCreate = z.input<typeof TrunkCreateSchema>;
export type TrunkUpdate = z.input<typeof TrunkUpdateSchema>;

/** A realistic example used in tests and the generated OpenAPI document. */
export const TRUNK_EXAMPLE: Trunk = {
  id: 'trunk_Zm9vYmFy',
  name: 'agent-dev',
  direction: 'both',
  enabled: true,
  auth_mode: 'none',
  allowed_ips: [],
  register: false,
  transport: 'udp',
  target_host: 'host.docker.internal',
  target_port: 5060,
  dial_rewrite: { rules: [] },
  codecs: ['ulaw', 'alaw'],
  dtmf_mode: 'rfc2833',
  media_encryption: 'none',
  record: false,
  max_cps: null,
  max_channels: null,
  source: 'ui',
  created_at: '2026-07-13T10:02:00.000Z',
};
