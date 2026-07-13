// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { TRUNK_EXAMPLE } from '@switchboard/shared';
import { noopProvisioner } from './provisioner';

describe('noopProvisioner', () => {
  it('does nothing on apply and remove', async () => {
    await expect(noopProvisioner.apply(TRUNK_EXAMPLE)).resolves.toBeUndefined();
    await expect(
      noopProvisioner.remove(TRUNK_EXAMPLE.id),
    ).resolves.toBeUndefined();
  });
});
