import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { NotificationService } from '@/server/services/notification.service';
import { route } from '@/server/http/route';

export const PATCH = route<{ notificationId: string }>(async (req, { params }) => {
  const session = await requireUser(req);
  const notification = await NotificationService.markAsRead(session.userId, params.notificationId);
  return NextResponse.json({ notification });
});
