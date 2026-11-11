import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { NotificationService } from '@/server/services/notification.service';
import { formatErrorResponse } from '@/server/errors/app-error';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const orgId = req.nextUrl.searchParams.get('organizationId') || undefined;

    const notifs = await NotificationService.getUserNotifications(session.userId, orgId);
    return NextResponse.json({ notifications: notifs });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}
