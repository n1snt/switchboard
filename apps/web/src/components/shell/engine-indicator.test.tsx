// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { EngineStatus, Health } from '@switchboard/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createQueryClient } from '@/lib/query';
import { EngineIndicator } from './engine-indicator';

function mockHealth(engine: EngineStatus): void {
  const body: Health = { status: 'ok', engine, version: '0.0.0' };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    }),
  );
}

function renderIndicator(): void {
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }): ReactNode => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  render(<EngineIndicator />, { wrapper });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EngineIndicator', () => {
  it('shows engine ok when the engine is connected', async () => {
    mockHealth('connected');
    renderIndicator();
    expect(await screen.findByText('engine ok')).toBeInTheDocument();
  });

  it('shows engine down when the engine is not connected', async () => {
    mockHealth('disconnected');
    renderIndicator();
    expect(await screen.findByText('engine down')).toBeInTheDocument();
  });

  it('shows engine down while the health query is loading', () => {
    // fetch never resolves, so the query stays pending.
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    renderIndicator();
    expect(screen.getByText('engine down')).toBeInTheDocument();
  });
});
