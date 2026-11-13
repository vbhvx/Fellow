import { NextRequest } from 'next/server';
import { z } from 'zod';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';

type RouteContext<P> = { params: P };
type Handler<P> = (req: NextRequest, ctx: RouteContext<P>) => Promise<Response>;
// Next always passes the context; it is optional so routes without params can be called with a request alone.
type RouteHandler<P> = (req: NextRequest, ctx?: RouteContext<P>) => Promise<Response>;

/**
 * The one error boundary for API route handlers: anything a handler throws (an AppError, a
 * malformed JSON body, an unexpected exception) becomes the standard `{ error: {...} }` response
 * carrying the request id. Handlers therefore contain no try/catch of their own.
 */
export function route<P = Record<string, never>>(handler: Handler<P>): RouteHandler<P> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx ?? { params: {} as P });
    } catch (error) {
      return formatErrorResponse(error, req);
    }
  };
}

function validate<S extends z.ZodTypeAny>(schema: S, input: unknown, message: string): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(message, result.error.flatten().fieldErrors);
  }
  return result.data;
}

/** Parses and validates a JSON body; a malformed body is a 400 (see formatErrorResponse), a bad shape a 422. */
export async function parseBody<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
  message = 'Invalid request body'
): Promise<z.infer<S>> {
  return validate(schema, await req.json(), message);
}

/** Like parseBody, for endpoints whose body may be omitted entirely. */
export async function parseOptionalBody<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
  message = 'Invalid request body'
): Promise<z.infer<S>> {
  const text = await req.text();
  return validate(schema, text.trim() ? JSON.parse(text) : {}, message);
}

/** Validates query parameters; empty values are treated as absent. */
export function parseQuery<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
  message = 'Invalid query parameters'
): z.infer<S> {
  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    if (value !== '') params[key] = value;
  });
  return validate(schema, params, message);
}
