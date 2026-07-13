// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { Phone } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useNumbers } from '@/features/numbers/hooks';
import { useTrunks } from '@/features/trunks/hooks';
import { useSoftphoneStore } from '@/stores/softphone';
import { buildDestinations } from './dial-destinations';
import { Keypad } from './keypad';

// The dialler: pick a saved destination or type an ad-hoc SIP URI/number, edit
// with the keypad, and place the call. Recently-called destinations surface as
// quick chips. Placing a call hands the target to the softphone session.

const GROUPS = ['Trunks', 'Numbers'] as const;

export function Dialler(): ReactNode {
  const trunks = useTrunks();
  const numbers = useNumbers();
  const recents = useSoftphoneStore((state) => state.recents);
  const placeCall = useSoftphoneStore((state) => state.placeCall);
  const [target, setTarget] = useState('');

  const destinations = buildDestinations(trunks.data ?? [], numbers.data ?? []);
  const trimmed = target.trim();

  function call(): void {
    if (trimmed !== '') {
      placeCall(trimmed);
    }
  }

  return (
    <section className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Place a call</h1>

      <Field id="destination" label="Destination">
        <Select
          id="destination"
          value={target}
          onChange={(event) => {
            setTarget(event.target.value);
          }}
        >
          <option value="">Choose a destination…</option>
          {GROUPS.map((group) => {
            const items = destinations.filter((dest) => dest.group === group);
            return items.length === 0 ? null : (
              <optgroup key={group} label={group}>
                {items.map((dest) => (
                  <option key={`${group}-${dest.value}`} value={dest.value}>
                    {dest.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </Select>
      </Field>

      <Field id="target" label="Number or SIP URI">
        <Input
          id="target"
          placeholder="sip:agent@10.0.0.5 or +14155550123"
          value={target}
          onChange={(event) => {
            setTarget(event.target.value);
          }}
        />
      </Field>

      <Keypad
        onPress={(key) => {
          setTarget((current) => current + key);
        }}
      />

      <Button
        type="button"
        variant="primary"
        disabled={trimmed === ''}
        onClick={call}
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        Call
      </Button>

      {recents.length === 0 ? null : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-500">Recent:</span>
          {recents.map((entry) => (
            <button
              key={entry}
              type="button"
              className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              onClick={() => {
                setTarget(entry);
              }}
            >
              {entry}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
