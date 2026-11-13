export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** True when the server rejected a write because the resource changed underneath it (HTTP 409). */
export function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 409;
}

/** A message safe to show the user for any thrown value, so callers never need `catch (err: any)`. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return 'Could not reach the server. Check your connection and try again.';
  return fallback;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorInfo = data?.error || {};
    throw new ApiError(
      errorInfo.message || `Request failed with status ${response.status}`,
      errorInfo.code || 'UNKNOWN_ERROR',
      response.status,
      errorInfo.details
    );
  }

  return data as T;
}

