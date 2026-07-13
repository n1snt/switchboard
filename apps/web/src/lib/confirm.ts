// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

// Destructive actions confirm before proceeding (see ux.md). Wrapping the
// native prompt in one function keeps the confirmation policy in a single,
// stubbable place.

/** Ask the user to confirm a destructive action; returns their choice. */
export function confirmAction(message: string): boolean {
  return window.confirm(message);
}
