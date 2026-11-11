import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/server/observability/logger';

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'RATE_LIMITED'
  | 'INTERNAL_SERVER_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: ErrorCode = 'BAD_REQUEST', statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'A concurrency conflict occurred. The resource was modified by another operation.') {
    super(message, 'CONFLICT', 409);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 'VALIDATION_ERROR', 422, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, 'BAD_REQUEST', 400, details);
  }
}

export const REQUEST_ID_HEADER = 'x-request-id';

export function requestIdOf(req?: NextRequest | string): string {
  if (typeof req === 'string') return req;
  return req?.headers.get(REQUEST_ID_HEADER) || `req_${crypto.randomUUID()}`;
}

export function formatErrorResponse(error: unknown, req?: NextRequest | string) {
  const requestId = requestIdOf(req);
  const headers: Record<string, string> = { [REQUEST_ID_HEADER]: requestId };

  // `await req.json()` on a malformed body is a client error, not a server fault.
  if (error instanceof SyntaxError) {
    error = new BadRequestError('Request body must be valid JSON');
  }

  if (error instanceof AppError) {
    if (error.code === 'RATE_LIMITED') {
      const retryAfter = (error.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds;
      if (retryAfter) headers['retry-after'] = String(retryAfter);
    }
    if (error.statusCode >= 500) {
      logger.error('request failed', { requestId, code: error.code, err: error });
    }
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.statusCode, headers }
    );
  }

  logger.error('unhandled server error', {
    requestId,
    method: typeof req === 'object' ? req.method : undefined,
    path: typeof req === 'object' ? req.nextUrl.pathname : undefined,
    err: error,
  });
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred.',
        requestId,
      },
    },
    { status: 500, headers }
  );
}
