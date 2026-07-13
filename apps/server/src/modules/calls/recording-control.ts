// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { Call } from '@switchboard/shared';

// Bridges the recording-control HTTP route (calls.routes.ts) to the live call
// coordinator (feature 24, the in-call Record toggle). The coordinator is created
// when ARI connects, after the HTTP app is built, so the route holds this handle
// and the composition root attaches the coordinator to it once connected.

export interface RecordingControl {
  /** Toggle recording on a live call; null when the call is not currently live. */
  setRecording(callId: string, enabled: boolean): Promise<Call | null>;
}

/** A control that never has a live call; the default for engine-less runs. */
export const noopRecordingControl: RecordingControl = {
  setRecording: () => Promise.resolve(null),
};

/** A control that delegates to whatever coordinator is currently connected. */
export class LiveRecordingControl implements RecordingControl {
  private controller: RecordingControl | undefined;

  attach(controller: RecordingControl): void {
    this.controller = controller;
  }

  setRecording(callId: string, enabled: boolean): Promise<Call | null> {
    return this.controller === undefined
      ? Promise.resolve(null)
      : this.controller.setRecording(callId, enabled);
  }
}
