import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { OrganizationService } from '@/server/services/organization.service';
import { formatErrorResponse } from '@/server/errors/app-error';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { organizationId: string; userId: string } }
) {
  try {
    const session = await requireUser(req);
    await OrganizationService.removeMember(session.userId, params.organizationId, params.userId);
    return NextResponse.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

