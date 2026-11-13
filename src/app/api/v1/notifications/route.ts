import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { NotificationService } from '@/server/services/notification.service';
import { notificationListQuerySchema } from '@/server/validation/schemas';
import { parseQuery, route } from '@/server/http/route';

export const dynamic = 'force-dynamic';

export const GET = route(async (req) => {
  const session = await requireUser(req);
  const { organizationId } = parseQuery(req, notificationListQuerySchema);
  const notifications = await NotificationService.getUserNotifications(session.userId, organizationId);
  return NextResponse.json({ notifications });
});
