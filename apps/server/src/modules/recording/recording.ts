// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createReadStream, existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { notFound } from '../../plugins/errors';
import type { CallRepo } from '../calls/calls.repo';

// Feature 24: recording. The record decision is most-specific-first (per-call,
// then per-trunk, then the global setting/env), and finished recordings are
// served for playback and download from the recordings directory. The engine
// (Asterisk MixMonitor over ARI) does the actual capture; see
// documentation/dev/control-plane.md.

/** Resolve whether a call should be recorded, most specific setting winning. */
export function resolveRecordEnabled(
  perCall: boolean | undefined,
  perTrunk: boolean | undefined,
  globalRecordAll: boolean,
): boolean {
  return perCall ?? perTrunk ?? globalRecordAll;
}

/** Resolve a stored recording name to an absolute path inside the directory, or null if it escapes it. */
export function resolveWithin(dir: string, name: string): string | null {
  const base = resolve(dir);
  const full = resolve(base, name);
  return full.startsWith(base + sep) ? full : null;
}

/** Register the recording download route (binary, so outside the ts-rest contract). */
export function registerRecordingRoutes(
  app: FastifyInstance,
  callRepo: CallRepo,
  recordingsDir: string,
): void {
  app.get<{ Params: { id: string } }>(
    '/api/v1/calls/:id/recording',
    async (request, reply) => {
      const call = await callRepo.get(request.params.id);
      if (!call || call.recording === null) {
        throw notFound(`No recording for call ${request.params.id}`);
      }
      const path = resolveWithin(recordingsDir, call.recording);
      if (path === null || !existsSync(path)) {
        throw notFound(
          `Recording file for call ${request.params.id} not found`,
        );
      }
      return reply.type('audio/wav').send(createReadStream(path));
    },
  );
}
