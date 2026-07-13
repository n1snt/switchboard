// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmAction } from './confirm';

describe('confirmAction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates to window.confirm', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    expect(confirmAction('Delete?')).toBe(true);
    expect(confirm).toHaveBeenCalledWith('Delete?');
  });
});
