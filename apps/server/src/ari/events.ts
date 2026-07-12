// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

// Zod schemas for the ARI events the call features consume. Every event is
// validated here before use, so a malformed payload from the engine is rejected
// at the boundary rather than trusted (CLAUDE.md: validate all external input).

const AriCaller = z.object({
  number: z.string().optional(),
  name: z.string().optional(),
});

const AriDialplan = z.object({
  exten: z.string().optional(),
});

export const AriChannelSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  state: z.string().optional(),
  caller: AriCaller.optional(),
  dialplan: AriDialplan.optional(),
});

export const StasisStartEventSchema = z.object({
  type: z.literal('StasisStart'),
  args: z.array(z.string()).default([]),
  channel: AriChannelSchema,
});

export const StasisEndEventSchema = z.object({
  type: z.literal('StasisEnd'),
  channel: AriChannelSchema,
});

export const ChannelStateChangeEventSchema = z.object({
  type: z.literal('ChannelStateChange'),
  channel: AriChannelSchema,
});

export const ChannelHangupRequestEventSchema = z.object({
  type: z.literal('ChannelHangupRequest'),
  channel: AriChannelSchema,
  cause: z.number().optional(),
});

export type AriChannel = z.infer<typeof AriChannelSchema>;
export type StasisStartEvent = z.infer<typeof StasisStartEventSchema>;
export type StasisEndEvent = z.infer<typeof StasisEndEventSchema>;
export type ChannelHangupRequestEvent = z.infer<
  typeof ChannelHangupRequestEventSchema
>;
