// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Trunk } from '@switchboard/shared';

// The trunk service reflects create/update/delete onto the engine through this
// interface, so the service is testable without an engine and the provisioning
// strategy (feature 11, PJSIP realtime) is swappable.
export interface TrunkProvisioner {
  apply(trunk: Trunk): Promise<void>;
  remove(trunkId: string): Promise<void>;
}

/** A provisioner that does nothing, for tests and engine-less runs. */
export const noopProvisioner: TrunkProvisioner = {
  apply: () => Promise.resolve(),
  remove: () => Promise.resolve(),
};
