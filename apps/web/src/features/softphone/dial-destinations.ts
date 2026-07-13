// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { PhoneNumber, Trunk } from '@switchboard/shared';

// Builds the dialler's destination list from the configured trunks and numbers.
// Placing a call is the system-under-test's inbound direction, so only
// inbound-capable trunks (inbound or both) are dialable; outbound-only trunks
// only deliver calls and are hidden from the picker.

export interface Destination {
  /** The value dialled and passed to the softphone session. */
  value: string;
  /** What the picker shows. */
  label: string;
  group: 'Trunks' | 'Numbers';
}

export function buildDestinations(
  trunks: readonly Trunk[],
  numbers: readonly PhoneNumber[],
): Destination[] {
  const trunkDestinations: Destination[] = trunks
    .filter((trunk) => trunk.enabled && trunk.direction !== 'outbound')
    .map((trunk) => ({
      value: trunk.name,
      label: trunk.name,
      group: 'Trunks',
    }));

  const numberDestinations: Destination[] = numbers.map((number) => ({
    value: number.e164,
    label:
      number.label === undefined
        ? number.e164
        : `${number.label} (${number.e164})`,
    group: 'Numbers',
  }));

  return [...trunkDestinations, ...numberDestinations];
}
