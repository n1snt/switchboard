// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

/* v8 ignore file -- engine log tail: filesystem I/O against Asterisk's PJSIP
   logger output on a shared volume. Exercised against a running engine, not by
   unit tests (the trace pipeline it feeds, sip-trace-capture.ts, is unit-tested
   with plain text). See documentation/dev/observability.md. */

import { closeSync, fstatSync, openSync, readSync, watch } from 'node:fs';

/**
 * Tail a growing file, handing each appended chunk to `onText`. Feature 23's
 * runtime source: Asterisk writes its PJSIP SIP-message log to a file on the
 * shared log volume, and the API tails it into the SIP trace capture. Missing or
 * unreadable files are tolerated (the pipeline simply produces no trace).
 * Returns a stop function.
 */
export function tailFile(
  path: string,
  onText: (text: string) => void,
): () => void {
  let position = 0;
  let fd: number;
  try {
    fd = openSync(path, 'r');
  } catch {
    return () => {};
  }

  const pump = (): void => {
    const { size } = fstatSync(fd);
    if (size < position) {
      position = 0;
    }
    if (size <= position) {
      return;
    }
    const length = size - position;
    const buffer = Buffer.allocUnsafe(length);
    const read = readSync(fd, buffer, 0, length, position);
    position += read;
    onText(buffer.toString('utf8', 0, read));
  };

  pump();
  const watcher = watch(path, () => pump());
  return () => {
    watcher.close();
    closeSync(fd);
  };
}
