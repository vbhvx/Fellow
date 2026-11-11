import { NextRequest, NextResponse } from 'next/server';

const REQUEST_ID_HEADER = 'x-request-id';
const VALID_REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;

// Assigns every API request a correlation id (honouring a sane upstream one) and exposes it on
// both the request seen by route handlers and the response returned to the client.
export function middleware(req: NextRequest) {
  const incoming = req.headers.get(REQUEST_ID_HEADER);
  const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : `req_${crypto.randomUUID()}`;

  const headers = new Headers(req.headers);
  headers.set(REQUEST_ID_HEADER, requestId);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
