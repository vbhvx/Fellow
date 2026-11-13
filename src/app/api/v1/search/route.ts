import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { SearchService } from '@/server/services/search.service';
import { searchQuerySchema } from '@/server/validation/schemas';
import { parseQuery, route } from '@/server/http/route';

export const dynamic = 'force-dynamic';

export const GET = route(async (req) => {
  const session = await requireUser(req);
  const { organizationId, q, assigneeId, ...filters } = parseQuery(req, searchQuerySchema, 'Invalid search parameters');
  const results = await SearchService.searchResources(session.userId, organizationId, q ?? '', {
    ...filters,
    assigneeId: assigneeId === 'me' ? session.userId : assigneeId,
  });
  return NextResponse.json(results);
});
