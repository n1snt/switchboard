// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

/* v8 ignore file -- thin seam over the real ari-client library: exercised
   against a running engine, not by unit tests (the connection lifecycle and
   handlers are tested with an injected connector). */

import AriClient from 'ari-client';
import type { AriConfig } from '../config';
import type { AriConnector } from './connection';

/** A connector that opens a real ARI WebSocket using the configured credentials. */
export function realConnector(config: AriConfig): AriConnector {
  return () => AriClient.connect(config.url, config.username, config.password);
}
