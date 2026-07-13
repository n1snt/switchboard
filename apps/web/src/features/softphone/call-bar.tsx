// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { Link } from '@tanstack/react-router';
import { Mic, MicOff, Pause, Play, PhoneOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/format';
import { useSoftphoneStore } from '@/stores/softphone';
import { useElapsedSeconds } from './use-duration';

// The docked call bar: mirrors the core controls on every screen so call
// control never depends on which screen you are on, and expands to the Phone
// screen on click. Hidden while idle.

export function CallBar(): ReactNode {
  const callState = useSoftphoneStore((state) => state.callState);
  const activeCall = useSoftphoneStore((state) => state.activeCall);
  const muted = useSoftphoneStore((state) => state.muted);
  const held = useSoftphoneStore((state) => state.held);
  const answeredAt = useSoftphoneStore((state) => state.answeredAt);
  const toggleMute = useSoftphoneStore((state) => state.toggleMute);
  const toggleHold = useSoftphoneStore((state) => state.toggleHold);
  const hangup = useSoftphoneStore((state) => state.hangup);
  const reset = useSoftphoneStore((state) => state.reset);
  const seconds = useElapsedSeconds(answeredAt);

  if (callState === 'idle' || callState === 'ended' || activeCall === null) {
    return null;
  }

  const inCall = callState === 'in-call';

  return (
    <div
      className="flex h-14 shrink-0 items-center gap-3 border-t border-neutral-200 px-4 dark:border-neutral-800"
      role="region"
      aria-label="Active call"
    >
      <Link
        to="/phone"
        className="flex items-center gap-2 text-sm hover:underline"
      >
        <span className="font-medium">On call</span>
        <span className="font-mono">{activeCall.peer}</span>
        {inCall ? (
          <span className="text-neutral-500">{formatDuration(seconds)}</span>
        ) : null}
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={muted ? 'Unmute' : 'Mute'}
          aria-pressed={muted}
          onClick={toggleMute}
        >
          {muted ? (
            <MicOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Mic className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={held ? 'Resume' : 'Hold'}
          aria-pressed={held}
          onClick={toggleHold}
        >
          {held ? (
            <Play className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Pause className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="icon"
          aria-label="End call"
          onClick={() => {
            hangup();
            reset();
          }}
        >
          <PhoneOff className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
