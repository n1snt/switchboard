// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

/**
 * The minimal logging surface Switchboard's internals depend on. The server wires
 * Fastify's pino logger to this; tests pass a spy. Keeping it small means logic
 * modules never depend on the concrete logger.
 */
export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
