// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

// One-click copy is core to the tool (see ux.md): endpoints, credentials, and
// SIP URIs are meant to be pasted into another system. This wraps the async
// Clipboard API so callers get a single promise to await and tests can stub
// `navigator.clipboard` deterministically.

/** Copy text to the clipboard. Rejects if the Clipboard API is unavailable. */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
