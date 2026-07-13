// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import type { SipTraceEntry } from '@switchboard/shared';

// Feature 23: parse Asterisk's PJSIP logger output into SIP trace entries for the
// call-ladder diagram. Each logged message is framed by a marker line such as
// `<--- Received SIP request ... --->` or `<--- Transmitting SIP response ... --->`
// followed by the raw SIP message whose first line is the method or status. The
// message's Call-ID header is extracted too so a call's ladder can be filtered to
// its own dialogs when several are in flight (sip-trace-capture.ts).

const RECEIVED = /<---\s*Received\s+SIP/i;
const TRANSMITTING = /<---\s*Transmitting\s+SIP/i;
const CALL_ID = /^(?:Call-ID|i):\s*(.+)$/i;

/** Turn a SIP start line into a short method/status label. */
function labelFor(startLine: string): string {
  const spaceIndex = startLine.indexOf(' ');
  const first = spaceIndex === -1 ? startLine : startLine.slice(0, spaceIndex);
  if (first !== 'SIP/2.0') {
    return first;
  }
  const rest = startLine.slice(spaceIndex + 1).trim();
  const codeIndex = rest.indexOf(' ');
  return codeIndex === -1 ? rest : rest.slice(0, codeIndex);
}

/** The Call-ID header value found within a message block, if any. */
function callIdFor(block: string[]): string | undefined {
  for (const line of block) {
    const value = CALL_ID.exec(line.trim())?.[1];
    if (value !== undefined) {
      return value.trim();
    }
  }
  return undefined;
}

export interface ParseOptions {
  now?: () => string;
}

/** One parsed SIP message: the ladder entry plus its dialog Call-ID. */
export interface ParsedSipMessage {
  entry: SipTraceEntry;
  callId: string | undefined;
}

/** Parse raw PJSIP logger text into ordered messages with their Call-IDs. */
export function parseSipMessages(
  raw: string,
  options: ParseOptions = {},
): ParsedSipMessage[] {
  const now = options.now ?? ((): string => new Date().toISOString());
  const messages: ParsedSipMessage[] = [];
  let direction: 'incoming' | 'outgoing' | null = null;
  let block: string[] = [];

  // A marker line closes the previous message's block and opens the next.
  const flush = (): void => {
    if (direction === null) {
      return;
    }
    const startLine = block.find((line) => line.trim().length > 0)?.trim();
    if (startLine !== undefined) {
      messages.push({
        entry: {
          at: now(),
          direction,
          method: labelFor(startLine),
          summary: startLine,
        },
        callId: callIdFor(block),
      });
    }
  };

  for (const line of raw.split('\n')) {
    const received = RECEIVED.test(line);
    if (received || TRANSMITTING.test(line)) {
      flush();
      direction = received ? 'incoming' : 'outgoing';
      block = [];
      continue;
    }
    block.push(line);
  }
  flush();
  return messages;
}

/** Parse raw PJSIP logger text into ordered SIP trace entries. */
export function parseSipTrace(
  raw: string,
  options: ParseOptions = {},
): SipTraceEntry[] {
  return parseSipMessages(raw, options).map((message) => message.entry);
}
