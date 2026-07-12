// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

// The command-line interface is built in feature 29 (Part G). This placeholder
// exists so the package installs, type-checks, and has a suite for the coverage
// harness from the first commit.

import { SWITCHBOARD_VERSION } from '@switchboard/shared';

/** Returns the CLI banner string. */
export function banner(): string {
  return `switchboard ${SWITCHBOARD_VERSION}`;
}
