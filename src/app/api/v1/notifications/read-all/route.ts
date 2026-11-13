import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { NotificationService } from '@/server/services/notification.service';
import { markAllNotificationsReadSchema } from '@/server/validation/schemas';
import { parseOptionalBody, route } from '@/server/http/route';

export const POST = route(async (req) => {
  const session = await requireUser(req);
  const { organizationId } = await parseOptionalBody(req, markAllNotificationsReadSchema);
  await NotificationService.markAllAsRead(session.userId, organizationId);
  return NextResponse.json({ success: true });
});
