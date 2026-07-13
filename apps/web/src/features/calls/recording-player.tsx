// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { Download } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { recordingUrl } from '@/lib/api';

// Inline playback and download for a call's recording. The audio source and the
// download both point at the binary recording endpoint (not in the ts-rest
// contract); the browser streams it directly.

export function RecordingPlayer({ callId }: { callId: string }): ReactNode {
  const url = recordingUrl(callId);
  return (
    <div className="flex items-center gap-2">
      <audio controls src={url} aria-label="Call recording">
        <track kind="captions" />
      </audio>
      <Button asChild variant="ghost" size="icon">
        <a href={url} download aria-label="Download recording">
          <Download className="h-4 w-4" aria-hidden="true" />
        </a>
      </Button>
    </div>
  );
}
