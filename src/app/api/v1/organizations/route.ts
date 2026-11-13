import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { OrganizationService } from '@/server/services/organization.service';
import { createOrganizationSchema } from '@/server/validation/schemas';
import { parseBody, route } from '@/server/http/route';

export const dynamic = 'force-dynamic';

export const GET = route(async (req) => {
  const session = await requireUser(req);
  const organizations = await OrganizationService.getUserOrganizations(session.userId);
  return NextResponse.json({ organizations });
});

export const POST = route(async (req) => {
  const session = await requireUser(req);
  const input = await parseBody(req, createOrganizationSchema, 'Invalid organization input');
  const organization = await OrganizationService.createOrganization(session.userId, input);
  return NextResponse.json({ organization }, { status: 201 });
});
