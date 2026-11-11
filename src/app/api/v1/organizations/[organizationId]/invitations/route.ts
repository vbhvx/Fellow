import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { OrganizationService } from '@/server/services/organization.service';
import { createInvitationSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';

export async function POST(
  req: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const result = createInvitationSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid invitation input', result.error.flatten().fieldErrors);
    }

    const { invitation, token } = await OrganizationService.inviteMember(
      session.userId,
      params.organizationId,
      result.data
    );

    return NextResponse.json({ invitation, token }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

