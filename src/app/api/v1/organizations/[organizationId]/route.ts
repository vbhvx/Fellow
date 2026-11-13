import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { OrganizationService } from '@/server/services/organization.service';
import { updateOrganizationSchema } from '@/server/validation/schemas';
import { parseBody, route } from '@/server/http/route';

type Params = { organizationId: string };

export const GET = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const organization = await OrganizationService.getOrganizationById(session.userId, params.organizationId);
  return NextResponse.json({ organization });
});

export const PATCH = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const input = await parseBody(req, updateOrganizationSchema, 'Invalid update input');
  const organization = await OrganizationService.updateOrganization(session.userId, params.organizationId, input);
  return NextResponse.json({ organization });
});
