import { db } from '@/db/client';
import {
  organizations,
  organizationMemberships,
  organizationInvitations,
  users,
} from '@/db/schema';
import { permissions, OrgRole } from '@/server/authorization/permissions';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@/server/errors/app-error';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export class OrganizationService {
  static async createOrganization(userId: string, data: { name: string; slug?: string }) {
    let slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug) slug = `org-${crypto.randomBytes(4).toString('hex')}`;

    // Check slug uniqueness
    const existing = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
    if (existing.length > 0) {
      slug = `${slug}-${crypto.randomBytes(3).toString('hex')}`;
    }

    const orgId = `org_${crypto.randomUUID()}`;

    return await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({
          id: orgId,
          name: data.name,
          slug,
          createdBy: userId,
        })
        .returning();

      // Add creator as owner
      await tx.insert(organizationMemberships).values({
        id: `mem_${crypto.randomUUID()}`,
        organizationId: org.id,
        userId,
        role: 'owner',
      });

      return {
        ...org,
        role: 'owner' as OrgRole,
      };
    });
  }

  static async getUserOrganizations(userId: string) {
    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        createdBy: organizations.createdBy,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        role: organizationMemberships.role,
        joinedAt: organizationMemberships.joinedAt,
      })
      .from(organizationMemberships)
      .innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
      .where(eq(organizationMemberships.userId, userId));

    return rows;
  }

  static async getOrganizationById(userId: string, organizationId: string) {
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.userId, userId)
        )
      )
      .limit(1);

    if (!membership) {
      throw new NotFoundError('Organization not found or you do not have access');
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return {
      ...org,
      role: membership.role as OrgRole,
    };
  }

  static async updateOrganization(
    userId: string,
    organizationId: string,
    update: { name?: string; slug?: string }
  ) {
    const org = await this.getOrganizationById(userId, organizationId);
    if (!permissions.canManageOrganizationSettings({ organizationId, userId, role: org.role })) {
      throw new ForbiddenError('You do not have permission to manage organization settings');
    }

    if (update.slug && update.slug !== org.slug) {
      const existing = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, update.slug))
        .limit(1);
      if (existing.length > 0) {
        throw new BadRequestError('An organization with this slug already exists');
      }
    }

    const [updated] = await db
      .update(organizations)
      .set({
        ...(update.name ? { name: update.name } : {}),
        ...(update.slug ? { slug: update.slug } : {}),
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))
      .returning();

    return {
      ...updated,
      role: org.role,
    };
  }

  static async getOrganizationMembers(userId: string, organizationId: string) {
    const org = await this.getOrganizationById(userId, organizationId);
    if (!permissions.canViewOrganization({ organizationId, userId, role: org.role })) {
      throw new ForbiddenError('Access denied');
    }

    const rows = await db
      .select({
        id: organizationMemberships.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        role: organizationMemberships.role,
        joinedAt: organizationMemberships.joinedAt,
      })
      .from(organizationMemberships)
      .innerJoin(users, eq(organizationMemberships.userId, users.id))
      .where(eq(organizationMemberships.organizationId, organizationId));

    return rows;
  }

  static async inviteMember(
    userId: string,
    organizationId: string,
    data: { email: string; role: OrgRole }
  ) {
    const org = await this.getOrganizationById(userId, organizationId);
    if (!permissions.canManageOrganizationMembers({ organizationId, userId, role: org.role })) {
      throw new ForbiddenError('You do not have permission to invite members');
    }

    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invitation] = await db
      .insert(organizationInvitations)
      .values({
        id: `inv_${crypto.randomUUID()}`,
        organizationId,
        email: data.email.toLowerCase(),
        role: data.role,
        tokenHash,
        expiresAt,
        createdBy: userId,
      })
      .returning();

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
      token: plainToken,
    };
  }

  static async acceptInvitation(userId: string, plainToken: string) {
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    const [invitation] = await db
      .select()
      .from(organizationInvitations)
      .where(eq(organizationInvitations.tokenHash, tokenHash))
      .limit(1);

    if (!invitation) {
      throw new NotFoundError('Invalid invitation token');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestError('Invitation has already been accepted');
    }

    if (invitation.revokedAt) {
      throw new BadRequestError('Invitation has been revoked');
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      throw new BadRequestError('Invitation has expired');
    }

    return await db.transaction(async (tx) => {
      // Check if user is already a member
      const existing = await tx
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, invitation.organizationId),
            eq(organizationMemberships.userId, userId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new BadRequestError('You are already a member of this organization');
      }

      await tx.insert(organizationMemberships).values({
        id: `mem_${crypto.randomUUID()}`,
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
      });

      await tx
        .update(organizationInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(organizationInvitations.id, invitation.id));

      return {
        organizationId: invitation.organizationId,
        role: invitation.role,
      };
    });
  }

  static async removeMember(currentUserId: string, organizationId: string, targetUserId: string) {
    const org = await this.getOrganizationById(currentUserId, organizationId);
    if (!permissions.canManageOrganizationMembers({ organizationId, userId: currentUserId, role: org.role })) {
      throw new ForbiddenError('You do not have permission to remove members');
    }

    // Check target membership
    const [targetMembership] = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.userId, targetUserId)
        )
      )
      .limit(1);

    if (!targetMembership) {
      throw new NotFoundError('Target user is not a member of this organization');
    }

    // Protect last owner removal!
    if (targetMembership.role === 'owner') {
      const owners = await db
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, organizationId),
            eq(organizationMemberships.role, 'owner')
          )
        );

      if (owners.length <= 1) {
        throw new BadRequestError(
          'Cannot remove the last owner of the organization. Transfer ownership or assign another owner first.'
        );
      }
    }

    await db
      .delete(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.userId, targetUserId)
        )
      );

    return { success: true };
  }
}

