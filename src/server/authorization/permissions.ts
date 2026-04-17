export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer' | 'guest';
export type ProjectRole = 'lead' | 'member' | 'viewer';
export type ProjectVisibility = 'organization' | 'private' | 'guest';

export interface OrgMembershipContext {
  organizationId: string;
  userId: string;
  role: OrgRole;
}

export interface ProjectContext {
  id: string;
  organizationId: string;
  visibility: ProjectVisibility;
  createdBy: string;
}

export interface ProjectMembershipContext {
  projectId: string;
  userId: string;
  role: ProjectRole;
}

export interface TaskContext {
  id: string;
  organizationId: string;
  projectId: string;
  createdBy: string;
  assigneeId?: string | null;
}

export const permissions = {
  canViewOrganization(orgMembership?: OrgMembershipContext | null): boolean {
    return Boolean(orgMembership);
  },

  canManageOrganizationMembers(orgMembership?: OrgMembershipContext | null): boolean {
    if (!orgMembership) return false;
    return orgMembership.role === 'owner' || orgMembership.role === 'admin';
  },

  canManageOrganizationSettings(orgMembership?: OrgMembershipContext | null): boolean {
    if (!orgMembership) return false;
    return orgMembership.role === 'owner' || orgMembership.role === 'admin';
  },

  canTransferOwnership(orgMembership?: OrgMembershipContext | null): boolean {
    if (!orgMembership) return false;
    return orgMembership.role === 'owner';
  },

  canCreateProject(orgMembership?: OrgMembershipContext | null): boolean {
    if (!orgMembership) return false;
    return ['owner', 'admin', 'member'].includes(orgMembership.role);
  },

  canViewProject(
    orgMembership?: OrgMembershipContext | null,
    project?: ProjectContext | null,
    projectMembership?: ProjectMembershipContext | null
  ): boolean {
    if (!orgMembership || !project) return false;
    // Cross-tenant protection
    if (orgMembership.organizationId !== project.organizationId) return false;

    // Organization Owners and Admins have global visibility for administrative, compliance and audit oversight
    if (orgMembership.role === 'owner' || orgMembership.role === 'admin') {
      return true;
    }

    // Guests can ONLY view projects they have an explicit project membership for
    if (orgMembership.role === 'guest') {
      return Boolean(projectMembership && projectMembership.projectId === project.id);
    }

    // For Members and Viewers:
    if (project.visibility === 'organization' || project.visibility === 'guest') {
      return true;
    }

    // Private projects require explicit project membership
    if (project.visibility === 'private') {
      return Boolean(projectMembership && projectMembership.projectId === project.id);
    }

    return false;
  },

  canManageProject(
    orgMembership?: OrgMembershipContext | null,
    project?: ProjectContext | null,
    projectMembership?: ProjectMembershipContext | null
  ): boolean {
    if (!this.canViewProject(orgMembership, project, projectMembership)) return false;
    if (!orgMembership) return false;

    if (orgMembership.role === 'owner' || orgMembership.role === 'admin') return true;
    if (projectMembership && projectMembership.role === 'lead') return true;

    return false;
  },

  canCreateTask(
    orgMembership?: OrgMembershipContext | null,
    project?: ProjectContext | null,
    projectMembership?: ProjectMembershipContext | null
  ): boolean {
    if (!this.canViewProject(orgMembership, project, projectMembership)) return false;
    if (!orgMembership) return false;

    if (orgMembership.role === 'viewer') return false;
    if (projectMembership?.role === 'viewer') return false;

    return true;
  },

  canEditTask(
    orgMembership?: OrgMembershipContext | null,
    project?: ProjectContext | null,
    projectMembership?: ProjectMembershipContext | null,
    task?: TaskContext | null
  ): boolean {
    if (!this.canViewProject(orgMembership, project, projectMembership)) return false;
    if (!orgMembership) return false;
    if (task && task.organizationId !== orgMembership.organizationId) return false;
    if (task && project && task.projectId !== project.id) return false;

    if (orgMembership.role === 'viewer') return false;
    if (projectMembership?.role === 'viewer') return false;

    return true;
  },

  canChangeTaskStatus(
    orgMembership?: OrgMembershipContext | null,
    project?: ProjectContext | null,
    projectMembership?: ProjectMembershipContext | null,
    task?: TaskContext | null
  ): boolean {
    return this.canEditTask(orgMembership, project, projectMembership, task);
  },

  canReorderTask(
    orgMembership?: OrgMembershipContext | null,
    project?: ProjectContext | null,
    projectMembership?: ProjectMembershipContext | null,
    task?: TaskContext | null
  ): boolean {
    return this.canEditTask(orgMembership, project, projectMembership, task);
  },

  canDeleteTask(
    orgMembership?: OrgMembershipContext | null,
    project?: ProjectContext | null,
    projectMembership?: ProjectMembershipContext | null,
    task?: TaskContext | null,
    currentUserId?: string
  ): boolean {
    if (!this.canViewProject(orgMembership, project, projectMembership)) return false;
    if (!orgMembership) return false;
    if (task && task.organizationId !== orgMembership.organizationId) return false;

    // Owners and Admins can delete any task
    if (orgMembership.role === 'owner' || orgMembership.role === 'admin') return true;

    // Project lead can delete tasks
    if (projectMembership?.role === 'lead') return true;

    // Task creator can delete their own task
    if (task && currentUserId && task.createdBy === currentUserId) return true;

    return false;
  },

  canCommentOnTask(
    orgMembership?: OrgMembershipContext | null,
    project?: ProjectContext | null,
    projectMembership?: ProjectMembershipContext | null,
    task?: TaskContext | null
  ): boolean {
    if (!this.canViewProject(orgMembership, project, projectMembership)) return false;
    if (!orgMembership) return false;
    if (task && task.organizationId !== orgMembership.organizationId) return false;

    // Viewers cannot post comments
    if (orgMembership.role === 'viewer' || projectMembership?.role === 'viewer') {
      return false;
    }

    return true;
  },

  canManageWorkflow(
    orgMembership?: OrgMembershipContext | null,
    project?: ProjectContext | null,
    projectMembership?: ProjectMembershipContext | null
  ): boolean {
    return this.canManageProject(orgMembership, project, projectMembership);
  },
};

