// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Call, CallDirection, Codec, Trunk } from '@switchboard/shared';

// Presentation helpers shared across the call log, call detail, and softphone.
// Pure functions, so they are unit-tested directly and never depend on locale
// or timezone (timestamps are formatted in UTC for determinism).

/**
 * The dashboard never shows inbound/outbound for a call (see dashboard.md). A
 * call the softphone placed (data-model `inbound`) reads as "Placed"; one it
 * received (`outbound`) reads as "Received".
 */
export function directionLabel(
  direction: CallDirection,
): 'Placed' | 'Received' {
  return direction === 'inbound' ? 'Placed' : 'Received';
}

/** Friendly codec labels; the engine's names map to what a developer expects. */
const CODEC_LABELS: Record<Codec, string> = {
  ulaw: 'PCMU',
  alaw: 'PCMA',
  g722: 'G.722',
  opus: 'Opus',
  g729: 'G.729',
};

function isKnownCodec(value: string): value is Codec {
  return value in CODEC_LABELS;
}

/** Label a negotiated codec; unknown names pass through, null shows a dash. */
export function codecLabel(codec: string | null): string {
  if (codec === null) {
    return '—';
  }
  return isKnownCodec(codec) ? CODEC_LABELS[codec] : codec;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Format a duration in seconds as m:ss, or h:mm:ss past an hour. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${String(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${String(minutes)}:${pad(secs)}`;
}

/**
 * Talk time of a completed call, in seconds, or null when it never connected or
 * is still live. The log shows a duration only for answered, ended calls.
 */
export function callDurationSeconds(call: Call): number | null {
  if (call.answered_at === null || call.ended_at === null) {
    return null;
  }
  const start = Date.parse(call.answered_at);
  const end = Date.parse(call.ended_at);
  return Math.max(0, Math.round((end - start) / 1000));
}

/** Format an ISO 8601 timestamp as `YYYY-MM-DD HH:MM:SS` in UTC. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const y = date.getUTCFullYear();
  const mo = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${String(y)}-${mo}-${d} ${h}:${mi}:${s}`;
}

/**
 * The far party shown in the call log. For a placed call (data-model inbound)
 * that is who was dialled; for a received call (outbound) it is who called.
 */
export function callParty(
  call: Pick<Call, 'direction' | 'from_number' | 'to_number'>,
): string {
  return call.direction === 'inbound' ? call.to_number : call.from_number;
}

/** The host:port a trunk points at, or a dash when it has no target host. */
export function trunkAddress(
  trunk: Pick<Trunk, 'target_host' | 'target_port'>,
): string {
  if (trunk.target_host === undefined || trunk.target_host === '') {
    return '—';
  }
  return `${trunk.target_host}:${String(trunk.target_port)}`;
}
