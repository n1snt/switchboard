// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import * as shared from './index';

describe('package entrypoint', () => {
  it('re-exports the contract, schemas, events, and version', () => {
    expect(shared.contract).toBeDefined();
    expect(shared.TrunkSchema).toBeDefined();
    expect(shared.CallEventSchema).toBeDefined();
    expect(shared.SWITCHBOARD_VERSION).toBeDefined();
  });
});
