// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { defaultTrunkForm, formToTrunkInput, parseAddress } from './form-model';
import { useCreateTrunk } from './hooks';

// Quick add: the fast path for "save this SIP server so I can dial it later".
// It captures only a name and an address, with auth none, and closes on a
// successful save (see ux.md). The full field set lives in the Advanced form.

export function QuickAddDialog(): ReactNode {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const create = useCreateTrunk();

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (name.trim() === '' || address.trim() === '') {
      setError('Name and address are required.');
      return;
    }
    const { host, port } = parseAddress(address);
    const input = formToTrunkInput({
      ...defaultTrunkForm(),
      name,
      target_host: host,
      target_port: port,
      auth_mode: 'none',
    });
    create.mutate(input, {
      onSuccess: () => {
        setOpen(false);
        setName('');
        setAddress('');
        setError(null);
      },
      onError: (mutationError) => {
        setError(mutationError.message);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Quick add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Quick add SIP server</DialogTitle>
        <DialogDescription>
          Save a SIP server by name and address so you can dial it. Auth is set
          to none.
        </DialogDescription>
        <form className="mt-4 flex flex-col gap-4" onSubmit={submit} noValidate>
          <Field id="quick-name" label="Name">
            <Input
              id="quick-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </Field>
          <Field id="quick-address" label="Address">
            <Input
              id="quick-address"
              placeholder="192.168.1.10:5060"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
              }}
            />
          </Field>
          {error === null ? null : (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={create.isPending}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
