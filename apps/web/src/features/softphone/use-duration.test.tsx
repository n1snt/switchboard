// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { elapsedSeconds, useElapsedSeconds } from './use-duration';

describe('elapsedSeconds', () => {
  it('is zero when there is no start time', () => {
    expect(elapsedSeconds(null, 10_000)).toBe(0);
  });

  it('floors whole seconds since the start', () => {
    expect(elapsedSeconds(1_000, 4_500)).toBe(3);
  });

  it('never goes negative', () => {
    expect(elapsedSeconds(5_000, 1_000)).toBe(0);
  });
});

describe('useElapsedSeconds', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays at zero while there is no active call', () => {
    const { result } = renderHook(() => useElapsedSeconds(null));
    expect(result.current).toBe(0);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(0);
  });

  it('ticks up once per second while a call is active', () => {
    vi.setSystemTime(1_000_000);
    const { result } = renderHook(() => useElapsedSeconds(1_000_000));
    expect(result.current).toBe(0);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(2);
  });
});
