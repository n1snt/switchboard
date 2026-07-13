// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { DialRewrite, PhoneNumber, Trunk } from '@switchboard/shared';

// Features 16/17: the pure logic behind placing a call from the softphone. The
// coordinator uses these to resolve what to originate and how to format the
// dialed string; the ARI origination and bridging happen against a real engine.

/** Apply a trunk's rewrite rules then its technical prefix to a dialed string. */
export function applyDialRewrite(dialed: string, rewrite: DialRewrite): string {
  let result = dialed;
  for (const rule of rewrite.rules) {
    result = result.replace(new RegExp(rule.match), rule.replace);
  }
  if (rewrite.tech_prefix !== undefined && rewrite.tech_prefix !== '') {
    result = `${rewrite.tech_prefix}${result}`;
  }
  return result;
}

export interface DialTarget {
  kind: 'number' | 'trunk' | 'uri';
  /** The Asterisk endpoint or SIP URI to originate to. */
  endpoint: string;
  trunkId?: string;
}

/**
 * Resolve what the softphone dialed to a call target: an ad-hoc SIP URI, a saved
 * number (routed to its trunk), or a trunk by name. Returns undefined when
 * nothing matches.
 */
export function resolveDialTarget(
  dialed: string,
  data: { numbers: PhoneNumber[]; trunks: Trunk[] },
): DialTarget | undefined {
  if (dialed.startsWith('sip:')) {
    return { kind: 'uri', endpoint: dialed };
  }

  const number = data.numbers.find((n) => n.e164 === dialed);
  if (number) {
    const trunk = data.trunks.find((t) => t.id === number.trunk_id);
    if (trunk) {
      return {
        kind: 'number',
        endpoint: `PJSIP/${trunk.id}`,
        trunkId: trunk.id,
      };
    }
  }

  const byName = data.trunks.find((t) => t.name === dialed);
  if (byName) {
    return {
      kind: 'trunk',
      endpoint: `PJSIP/${byName.id}`,
      trunkId: byName.id,
    };
  }

  return undefined;
}
