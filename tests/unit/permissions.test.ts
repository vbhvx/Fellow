import { describe, it, expect } from 'vitest';
import { permissions } from '@/server/authorization/permissions';

describe('Permissions Matrix & Centralized Authorization Policy', () => {
  const orgId = 'org_test_1';
  const otherOrgId = 'org_test_2';
  const userId = 'usr_alice';

  const baseProject = {
    id: 'proj_public',
    organizationId: orgId,
    visibility: 'organization' as const,
    createdBy: 'usr_admin',
  };

  const privateProject = {
    id: 'proj_private',
    organizationId: orgId,
    visibility: 'private' as const,
    createdBy: 'usr_admin',
  };

  describe('Organization Member Policies', () => {
    it('allows owner, admin, member, viewer to view organization', () => {
      expect(permissions.canViewOrganization({ organizationId: orgId, userId, role: 'owner' })).toBe(true);
      expect(permissions.canViewOrganization({ organizationId: orgId, userId, role: 'admin' })).toBe(true);
      expect(permissions.canViewOrganization({ organizationId: orgId, userId, role: 'member' })).toBe(true);
      expect(permissions.canViewOrganization({ organizationId: orgId, userId, role: 'viewer' })).toBe(true);
      expect(permissions.canViewOrganization(null)).toBe(false);
    });

    it('only allows owner and admin to manage organization members', () => {
      expect(permissions.canManageOrganizationMembers({ organizationId: orgId, userId, role: 'owner' })).toBe(true);
      expect(permissions.canManageOrganizationMembers({ organizationId: orgId, userId, role: 'admin' })).toBe(true);
      expect(permissions.canManageOrganizationMembers({ organizationId: orgId, userId, role: 'member' })).toBe(false);
      expect(permissions.canManageOrganizationMembers({ organizationId: orgId, userId, role: 'viewer' })).toBe(false);
      expect(permissions.canManageOrganizationMembers({ organizationId: orgId, userId, role: 'guest' })).toBe(false);
    });

    it('only allows owner to transfer organization ownership', () => {
      expect(permissions.canTransferOwnership({ organizationId: orgId, userId, role: 'owner' })).toBe(true);
      expect(permissions.canTransferOwnership({ organizationId: orgId, userId, role: 'admin' })).toBe(false);
      expect(permissions.canTransferOwnership({ organizationId: orgId, userId, role: 'member' })).toBe(false);
    });
  });

  describe('Project Visibility and Access Policies', () => {
    it('grants owner and admin global project access within their organization', () => {
      const ownerMem = { organizationId: orgId, userId, role: 'owner' as const };
      const adminMem = { organizationId: orgId, userId, role: 'admin' as const };

      expect(permissions.canViewProject(ownerMem, baseProject, null)).toBe(true);
      expect(permissions.canViewProject(ownerMem, privateProject, null)).toBe(true);
      expect(permissions.canViewProject(adminMem, privateProject, null)).toBe(true);
    });

    it('strictly forbids cross-tenant access even for owners', () => {
      const ownerMem = { organizationId: otherOrgId, userId, role: 'owner' as const };
      expect(permissions.canViewProject(ownerMem, baseProject, null)).toBe(false);
      expect(permissions.canViewProject(ownerMem, privateProject, null)).toBe(false);
    });

    it('requires explicit project membership for private projects when user is member or viewer', () => {
      const memberMem = { organizationId: orgId, userId, role: 'member' as const };
      const viewerMem = { organizationId: orgId, userId, role: 'viewer' as const };

      // Organization visible projects
      expect(permissions.canViewProject(memberMem, baseProject, null)).toBe(true);
      expect(permissions.canViewProject(viewerMem, baseProject, null)).toBe(true);

      // Private project without membership
      expect(permissions.canViewProject(memberMem, privateProject, null)).toBe(false);
      expect(permissions.canViewProject(viewerMem, privateProject, null)).toBe(false);

      // Private project with explicit membership
      const pmContext = { projectId: privateProject.id, userId, role: 'member' as const };
      expect(permissions.canViewProject(memberMem, privateProject, pmContext)).toBe(true);
    });

    it('restricts guests to only explicitly permitted projects', () => {
      const guestMem = { organizationId: orgId, userId, role: 'guest' as const };

      expect(permissions.canViewProject(guestMem, baseProject, null)).toBe(false);
      expect(permissions.canViewProject(guestMem, privateProject, null)).toBe(false);

      const pmContext = { projectId: baseProject.id, userId, role: 'viewer' as const };
      expect(permissions.canViewProject(guestMem, baseProject, pmContext)).toBe(true);
    });
  });

  describe('Task Operations & Roles', () => {
    const memberMem = { organizationId: orgId, userId, role: 'member' as const };
    const viewerMem = { organizationId: orgId, userId, role: 'viewer' as const };
    const task = {
      id: 'task_1',
      organizationId: orgId,
      projectId: baseProject.id,
      createdBy: userId,
    };

    it('allows members to create and edit tasks, but prevents viewers from mutating', () => {
      expect(permissions.canCreateTask(memberMem, baseProject, null)).toBe(true);
      expect(permissions.canEditTask(memberMem, baseProject, null, task)).toBe(true);
      expect(permissions.canReorderTask(memberMem, baseProject, null, task)).toBe(true);

      expect(permissions.canCreateTask(viewerMem, baseProject, null)).toBe(false);
      expect(permissions.canEditTask(viewerMem, baseProject, null, task)).toBe(false);
      expect(permissions.canReorderTask(viewerMem, baseProject, null, task)).toBe(false);
    });

    it('enforces task deletion policy: creator, lead, admin, owner can delete; other members cannot', () => {
      const otherUserMem = { organizationId: orgId, userId: 'usr_bob', role: 'member' as const };
      const adminMem = { organizationId: orgId, userId: 'usr_admin', role: 'admin' as const };

      // Alice is creator -> can delete
      expect(permissions.canDeleteTask(memberMem, baseProject, null, task, userId)).toBe(true);

      // Bob is member but not creator -> cannot delete
      expect(permissions.canDeleteTask(otherUserMem, baseProject, null, task, 'usr_bob')).toBe(false);

      // Admin -> can delete any task
      expect(permissions.canDeleteTask(adminMem, baseProject, null, task, 'usr_admin')).toBe(true);
    });
  });
});

