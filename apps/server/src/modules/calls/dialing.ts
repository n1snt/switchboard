// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { DialRewrite, PhoneNumber, Trunk } from '@switchboard/shared';

// Feature 17: the pure logic behind the softphone placing a call. The coordinator
// uses this to resolve what to originate over ARI; the origination and bridging
// happen against a real engine.

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

export interface OutgoingPlan {
  /** The ARI endpoint the callee leg is originated to. */
  endpoint: string;
  /** The trunk the call rides, or null for a SIP URI or a bare extension. */
  trunkId: string | null;
  /** The target recorded as the call's to_number. */
  toNumber: string;
}

/**
 * Resolve what the softphone dialed to an origination plan: an ad-hoc SIP URI is
 * dialed as-is; a saved number is sent through its inbound trunk with the trunk's
 * dial rewrite applied; a trunk name is dialed through that trunk; anything else
 * is a bare endpoint (the browser-to-browser walking skeleton, e.g. `1002`).
 */
export function planOutgoing(
  dialed: string,
  data: { numbers: PhoneNumber[]; trunks: Trunk[] },
): OutgoingPlan {
  if (dialed.startsWith('sip:')) {
    return { endpoint: dialed, trunkId: null, toNumber: dialed };
  }

  const number = data.numbers.find((n) => n.e164 === dialed);
  if (number !== undefined) {
    const trunk = data.trunks.find((t) => t.id === number.trunk_id);
    if (trunk !== undefined) {
      const rewritten = applyDialRewrite(dialed, trunk.dial_rewrite);
      return {
        endpoint: `PJSIP/${rewritten}@${trunk.id}`,
        trunkId: trunk.id,
        toNumber: dialed,
      };
    }
  }

  const named = data.trunks.find((t) => t.name === dialed);
  if (named !== undefined) {
    return {
      endpoint: `PJSIP/${named.id}`,
      trunkId: named.id,
      toNumber: dialed,
    };
  }

  return { endpoint: `PJSIP/${dialed}`, trunkId: null, toNumber: dialed };
}
