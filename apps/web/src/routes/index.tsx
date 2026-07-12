// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, redirect } from '@tanstack/react-router';

// The root path has no screen of its own; it sends you to the softphone.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // TanStack Router signals a redirect by throwing the Redirect object.
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- framework redirect contract
    throw redirect({ to: '/phone' });
  },
});
