// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { RequestValidationError } from '@ts-rest/fastify';
import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { validationErrorHandler } from './ts-rest';

function zodError(): z.ZodError {
  const result = z.string().safeParse(123);
  if (result.success) {
    throw new Error('unreachable');
  }
  return result.error;
}

function fakeReply(): {
  reply: FastifyReply;
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
} {
  const send = vi.fn();
  const status = vi.fn().mockReturnValue({ send });
  const reply = { status } as unknown as FastifyReply;
  return { reply, status, send };
}

const request = {} as FastifyRequest;

describe('validationErrorHandler', () => {
  it('formats a body validation error into the shared envelope', () => {
    const { reply, status, send } = fakeReply();
    const err = new RequestValidationError(null, null, null, zodError());
    validationErrorHandler(err, request, reply);
    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'validation_error' }),
      }),
    );
    const sent = send.mock.calls[0]?.[0] as { error: { details?: unknown } };
    expect(sent.error.details).toBeDefined();
  });

  it('uses whichever segment failed (query here)', () => {
    const { reply, send } = fakeReply();
    validationErrorHandler(
      new RequestValidationError(null, null, zodError(), null),
      request,
      reply,
    );
    const sent = send.mock.calls[0]?.[0] as { error: { details?: unknown } };
    expect(sent.error.details).toBeDefined();
  });

  it('omits details when no segment carries a ZodError', () => {
    const { reply, send } = fakeReply();
    validationErrorHandler(
      new RequestValidationError(null, null, null, null),
      request,
      reply,
    );
    const sent = send.mock.calls[0]?.[0] as { error: { details?: unknown } };
    expect(sent.error.details).toBeUndefined();
  });
});
