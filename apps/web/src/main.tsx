// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

// Application bootstrap. The full router, Query client, and theme provider are
// mounted here in feature 5 (web skeleton). Excluded from coverage: this is the
// composition root, exercised by running the app, not by unit tests.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <div>Switchboard</div>
    </StrictMode>,
  );
}
