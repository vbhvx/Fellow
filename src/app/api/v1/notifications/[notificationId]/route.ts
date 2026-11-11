import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { NotificationService } from '@/server/services/notification.service';
import { formatErrorResponse } from '@/server/errors/app-error';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    const session = await requireUser(req);
    const updated = await NotificationService.markAsRead(session.userId, params.notificationId);
    return NextResponse.json({ notification: updated });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

