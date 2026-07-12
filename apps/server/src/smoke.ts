// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

// Feature-1 placeholder so the server package installs and has a suite to run.
// Replaced by the real Fastify application in feature 4.

import { SWITCHBOARD_VERSION } from '@switchboard/shared';

/** Placeholder health string used only by the feature-1 smoke test. */
export function smoke(): string {
  return `server ${SWITCHBOARD_VERSION}`;
}
