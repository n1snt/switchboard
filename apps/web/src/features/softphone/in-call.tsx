// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { Link } from '@tanstack/react-router';
import {
  Grid3x3,
  Mic,
  MicOff,
  Pause,
  PhoneOff,
  Play,
  ScrollText,
  Circle,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { codecLabel, formatDuration } from '@/lib/format';
import { useSoftphoneStore } from '@/stores/softphone';
import { Keypad } from './keypad';
import { useElapsedSeconds } from './use-duration';

// The full-size in-call interface: state, running duration, negotiated codec,
// and the core controls (end, mute, hold, DTMF keypad, record, volume, and a
// link to the live SIP trace). All controls act on the softphone store.

export function InCall(): ReactNode {
  const {
    activeCall,
    muted,
    held,
    recording,
    volume,
    codec,
    answeredAt,
    toggleMute,
    toggleHold,
    toggleRecording,
    setVolume,
    sendDtmf,
    hangup,
    reset,
  } = useSoftphoneStore();
  const seconds = useElapsedSeconds(answeredAt);
  const [showKeypad, setShowKeypad] = useState(false);

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-8">
      <p className="font-mono text-lg">{activeCall?.peer}</p>
      <p className="text-sm text-neutral-500" aria-label="Call duration">
        {formatDuration(seconds)} · {codecLabel(codec)}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant={muted ? 'primary' : 'secondary'}
          aria-pressed={muted}
          onClick={toggleMute}
        >
          {muted ? (
            <MicOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Mic className="h-4 w-4" aria-hidden="true" />
          )}
          {muted ? 'Unmute' : 'Mute'}
        </Button>
        <Button
          type="button"
          variant={held ? 'primary' : 'secondary'}
          aria-pressed={held}
          onClick={toggleHold}
        >
          {held ? (
            <Play className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Pause className="h-4 w-4" aria-hidden="true" />
          )}
          {held ? 'Resume' : 'Hold'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-pressed={showKeypad}
          onClick={() => {
            setShowKeypad((value) => !value);
          }}
        >
          <Grid3x3 className="h-4 w-4" aria-hidden="true" />
          Keypad
        </Button>
        <Button
          type="button"
          variant={recording ? 'danger' : 'secondary'}
          aria-pressed={recording}
          onClick={toggleRecording}
        >
          <Circle className="h-4 w-4" aria-hidden="true" />
          {recording ? 'Recording' : 'Record'}
        </Button>
        <Button asChild variant="ghost">
          <Link to="/calls">
            <ScrollText className="h-4 w-4" aria-hidden="true" />
            SIP trace
          </Link>
        </Button>
      </div>

      {showKeypad ? <Keypad onPress={sendDtmf} /> : null}

      <label className="flex w-full items-center gap-2 text-sm">
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={volume}
          aria-label="Output volume"
          onChange={(event) => {
            setVolume(Number(event.target.value));
          }}
        />
      </label>

      <Button
        type="button"
        variant="danger"
        onClick={() => {
          hangup();
          reset();
        }}
      >
        <PhoneOff className="h-4 w-4" aria-hidden="true" />
        End call
      </Button>
    </section>
  );
}
